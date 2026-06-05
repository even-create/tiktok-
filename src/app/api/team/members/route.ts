import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/current-user";
import { ADMIN_USER } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  status: string;
  protected: boolean;
};

export async function GET() {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("app_members")
    .select("id, name, email, role, status, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The fixed administrator (Even) is not stored in the table; surface a protected synthetic row.
  const adminRow: TeamMember = {
    id: ADMIN_USER.id,
    name: ADMIN_USER.name,
    email: "admin@local",
    role: "ADMIN",
    status: "ACTIVE",
    protected: true,
  };

  const members: TeamMember[] = (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string | null)?.trim() || (row.email as string),
    email: row.email as string,
    role: ((row.role as string | null) === "ADMIN" ? "ADMIN" : "MEMBER"),
    status: (row.status as string | null) || "ACTIVE",
    protected: false,
  }));

  return NextResponse.json({ members: [adminRow, ...members] });
}
