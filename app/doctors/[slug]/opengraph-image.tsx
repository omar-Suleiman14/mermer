import { ImageResponse } from "next/og";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const runtime = "edge";
export const alt = "Doctor Profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const doctor = await fetchQuery(api.doctors.getPublicDoctorProfile, { slug });

  if (!doctor) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', background: '#0a0a0a', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ color: 'white', fontSize: 60 }}>Doctor Not Found</h1>
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(to bottom right, #18181b, #000000)", // zinc-900 to black
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 40 }}>
          {/* Profile Photo */}
          {doctor.profilePhotoUrl ? (
            <img
              src={doctor.profilePhotoUrl}
              alt={doctor.name}
              style={{
                width: 200,
                height: 200,
                borderRadius: 100, // Round
                objectFit: "cover",
                border: "4px solid #0055FF",
              }}
            />
          ) : (
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                background: "#27272a", // zinc-800
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 80,
                fontWeight: "bold",
                color: "#0055FF",
                border: "4px solid #0055FF",
              }}
            >
              {doctor.name.charAt(0)}
            </div>
          )}

          {/* Text Content */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 10 }}>
            <h1
              style={{
                fontSize: 72,
                fontWeight: "bold",
                margin: 0,
                lineHeight: 1.1,
                color: "#ffffff",
              }}
            >
              Dr. {doctor.name}
            </h1>
            {doctor.specialty && (
              <p
                style={{
                  fontSize: 36,
                  color: "#0055FF", // Primary color
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                {doctor.specialty}
              </p>
            )}
            {(doctor.clinicName || doctor.city) && (
              <p
                style={{
                  fontSize: 28,
                  color: "#a1a1aa", // zinc-400
                  margin: 0,
                  marginTop: 10,
                }}
              >
                {[doctor.clinicName, doctor.city].filter(Boolean).join(" • ")}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#0055FF",
              padding: "16px 32px",
              borderRadius: 12,
              fontSize: 28,
              fontWeight: "bold",
              color: "white",
            }}
          >
            Book Appointment
          </div>
          <div style={{ fontSize: 36, fontWeight: "bold", color: "#e4e4e7", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#0055FF" }}>●</span> mermer
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
