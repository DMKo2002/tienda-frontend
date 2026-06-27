// Andreani API integration has been removed.
// Shipping is now fully configurable via Panel Admin → Mi tienda → Métodos de envío.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Andreani API integration removed' }, { status: 410 })
}
