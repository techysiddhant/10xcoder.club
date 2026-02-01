"use client";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import { ArrowRight, Package, MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
const ProfileQuickLinks = () => {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Links</CardTitle>
        <CardDescription>
          Access your submitted resources and activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={() => router.push("/my-submissions")}
          className="w-full cursor-pointer flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">My Submissions</p>
              <p className="text-sm text-muted-foreground">
                View all resources you've submitted
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <button
          type="button"
          disabled
          // onClick={() => router.push('/my-interview-experiences')}
          className="w-full cursor-not-allowed flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <MessageSquareText className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">
                My Interview Experiences
              </p>
              <p className="text-sm text-muted-foreground">
                Manage your shared interview stories
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 border-amber-500/20"
          >
            Coming Soon
          </Badge>
          {/* <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" /> */}
        </button>
      </CardContent>
    </Card>
  );
};

export default ProfileQuickLinks;
