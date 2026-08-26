import {NextResponse} from "next/server";
export async function POST(req:Request){const b=await req.json();if(!b.text?.trim())return NextResponse.json({error:"text is required"},{status:400});return NextResponse.json({text:String(b.text).trim()})}
