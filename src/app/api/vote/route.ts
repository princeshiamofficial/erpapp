
import { NextResponse } from 'next/server';
import { addVote, getVotesByPhone } from '@/lib/vote-service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, voteData } = body;

        if (!phone || !voteData) {
            return NextResponse.json({ success: false, error: 'Phone number and vote data are required.' }, { status: 400 });
        }

        // Check if already voted
        const existing = await getVotesByPhone(phone);
        if (existing.length > 0) {
            return NextResponse.json({ success: false, error: 'You have already voted.' }, { status: 400 });
        }

        // Save vote
        const success = await addVote(phone, voteData);

        if (!success) {
            return NextResponse.json({ success: false, error: 'Failed to record your vote.' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API Vote Route] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
