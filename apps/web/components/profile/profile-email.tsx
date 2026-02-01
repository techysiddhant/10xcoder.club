"use client";
import { User } from "@workspace/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import { cn } from "@/lib/utils";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import toast from "react-hot-toast";
const ProfileEmail = ({ user }: { user: User }) => {
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const handleSendVerificationEmail = async () => {
    setIsSendingVerification(true);
    await authClient.sendVerificationEmail(
      {
        email: user.email,
      },
      {
        onSuccess() {
          toast.success("Verification email sent successfully");
        },
        onError(error) {
          toast.error("Failed to send verification email. Please try again.");
        },
      },
    );
    setIsSendingVerification(false);
  };
  return (
    <Card
      className={cn(
        "border-2",
        user.emailVerified ? "border-emerald-500/20" : "border-amber-500/20",
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">Email Verification</CardTitle>
          </div>
          {user.emailVerified ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 border-amber-500/20"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              Not Verified
            </Badge>
          )}
        </div>
        <CardDescription>
          {user.emailVerified
            ? "Your email address has been verified"
            : "Verify your email to access all features"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Current email:</span>
            <span className="font-medium text-foreground">{user.email}</span>
          </div>
          {!user.emailVerified && (
            <Button
              onClick={handleSendVerificationEmail}
              disabled={isSendingVerification}
              size="sm"
            >
              {isSendingVerification ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Verification Email
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileEmail;
