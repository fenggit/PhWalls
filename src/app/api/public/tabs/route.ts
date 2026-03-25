import { NextRequest, NextResponse } from 'next/server';
import tabData from '@/data/tab.json';

export const runtime = 'edge';


export async function GET(_request: NextRequest) {
  try {
    const data = tabData as unknown;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching tabs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch tab data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
