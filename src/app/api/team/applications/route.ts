import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/current-user";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("member_applications")
    .select("id, name, email, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}
