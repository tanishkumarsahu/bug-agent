import { NextRequest, NextResponse } from 'next/server'
import { removeWatch, updateWatch, getWatch } from '@/store/watches'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  removeWatch(id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  updateWatch(id, body)
  return NextResponse.json(getWatch(id))
}
