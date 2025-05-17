
"use client";

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, CheckSquare, Users, DollarSign } from 'lucide-react'; // Updated import
import Image from 'next/image';

export default function DashboardPage() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return null; // Or a loading state, though layout should handle unauthorized access
  }

  const summaryCards = [
    { title: "Active Orders", value: "125", icon: Package, change: "+15.2%", dataAiHint: "delivery boxes" },
    { title: "Pending Approval", value: "12", icon: CheckSquare, change: "-3.1%", dataAiHint: "checklist form" },
    { title: "New Users", value: "8", icon: Users, change: "+5", dataAiHint: "team collaboration" },
    { title: "Revenue (MTD)", value: "$15,6K", icon: DollarSign, change: "+8.0%", dataAiHint: "financial chart" },
  ];


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl">Welcome to TrackFlow, {currentUser.name}!</CardTitle>
          <CardDescription className="text-lg">
            You are logged in as {currentUser.role}. Here's a quick overview of your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is your main dashboard. From here, you can navigate to various sections of the application using the sidebar.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Overview of recent order updates and comments.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <Image src="https://placehold.co/600x300.png" alt="Recent Activity Placeholder" data-ai-hint="activity feed" width={600} height={300} className="rounded-md object-cover" />
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
            <CardDescription>Visual breakdown of current order statuses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <Image src="https://placehold.co/600x300.png" alt="Order Status Chart Placeholder" data-ai-hint="pie chart" width={600} height={300} className="rounded-md object-cover"/>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
