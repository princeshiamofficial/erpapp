
import React from 'react';
import VoteClient from './VoteClient';
import { getOrders } from '@/lib/order-service';
import { getVotesByPhone } from '@/lib/vote-service';

export const revalidate = 0; // Disable caching for this dynamic route

interface VotePageProps {
    params: Promise<{
        phone: string;
    }>;
}

export default async function VotePage({ params }: VotePageProps) {
    const { phone } = await params;

    // Fetch orders to find the company name associated with this phone
    const allOrders = await getOrders();
    const customerOrder = allOrders.find(o => o.phoneNumber?.trim() === phone.trim());

    // Check if they already voted
    const existingVotes = await getVotesByPhone(phone);
    const alreadyVoted = existingVotes.length > 0;

    return (
        <VoteClient
            phone={phone}
            companyName={customerOrder?.companyName}
            alreadyVoted={alreadyVoted}
        />
    );
}
