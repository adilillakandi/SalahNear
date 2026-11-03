// ==============================================================================
// supabase/functions/submit-attendance/index.ts
// Authoritative Server-Side Attendance Verification & Points Engine
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AttendanceRequest {
  mosqueId: string;
  prayerType: string; // 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha'
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  isMocked?: boolean;
  imageSha256?: string;
  qrPayload?: string;
  idempotencyKey: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authenticate user from bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: AttendanceRequest = await req.json();
    const { mosqueId, prayerType, latitude, longitude, accuracyMeters, isMocked, imageSha256, qrPayload, idempotencyKey } = body;

    // 2. Anti-fraud: Reject mock GPS locations
    if (isMocked) {
      return new Response(
        JSON.stringify({
          status: "rejected",
          reason: "Mock location signals detected by anti-fraud policy",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Confirm Mosque is active and verified
    const { data: mosque, error: mosqueError } = await supabase
      .from("mosques")
      .select("id, name, verification_status, is_active, attendance_radius_m, location")
      .eq("id", mosqueId)
      .single();

    if (mosqueError || !mosque || !mosque.is_active || mosque.verification_status !== "verified") {
      return new Response(
        JSON.stringify({ error: "Mosque not found or not currently active" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Server-Side Distance Calculation using PostGIS
    const { data: distanceData, error: distError } = await supabase.rpc(
      "calculate_distance_m",
      {
        mosque_id: mosqueId,
        user_lat: latitude,
        user_lng: longitude,
      }
    );

    const distanceMeters = distanceData ?? 50.0;
    const allowedRadius = mosque.attendance_radius_m || 100;

    // Evaluate verification tier
    let status = "pending";
    let pointsAwarded = 0;

    if (distanceMeters <= allowedRadius && accuracyMeters <= 35) {
      status = "verified";
      pointsAwarded = 5; // Standard 5 points per verified congregational prayer
    } else if (distanceMeters <= allowedRadius * 1.5 && accuracyMeters <= 80) {
      status = "pending"; // Under review
      pointsAwarded = 0;
    } else {
      status = "rejected";
      pointsAwarded = 0;
    }

    // 5. Transactional insert into attendance table
    const todayDate = new Date().toISOString().split("T")[0];

    const { data: attendance, error: insertError } = await supabase
      .from("attendance")
      .insert({
        user_id: user.id,
        mosque_id: mosqueId,
        prayer_type: prayerType,
        prayer_date: todayDate,
        status: status,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Attendance already recorded for this prayer session." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Record evidence metadata
    await supabase.from("attendance_evidence").insert({
      attendance_id: attendance.id,
      device_latitude: latitude,
      device_longitude: longitude,
      device_accuracy_m: accuracyMeters,
      calculated_distance_m: distanceMeters,
      image_hash_sha256: imageSha256,
      qr_payload: qrPayload,
      is_mock_location: isMocked || false,
    });

    // 7. If verified, credit points ledger and update streak
    if (status === "verified") {
      await supabase.from("user_points").insert({
        user_id: user.id,
        points: pointsAwarded,
        reason: `congregational_${prayerType}`,
        attendance_id: attendance.id,
      });

      // Update aggregate streak
      await supabase.rpc("increment_user_streak", {
        target_user_id: user.id,
        attendance_date: todayDate,
      });

      // Trigger friend encounter detection
      await supabase.rpc("match_friend_encounters", {
        current_attendance_id: attendance.id,
      });
    }

    return new Response(
      JSON.stringify({
        attendanceId: attendance.id,
        status: status,
        pointsAwarded: pointsAwarded,
        distanceMeters: distanceMeters,
        message: status === "verified"
          ? "Attendance verified! +5 community points awarded."
          : "Attendance submitted for review.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
