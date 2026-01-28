"use client";
import { Button } from "@workspace/ui/components/button";
import { Avatar } from "@workspace/ui/components/avatar";
import { AvatarImage } from "@workspace/ui/components/avatar";
import { AvatarFallback } from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@workspace/ui/components/dropdown-menu";
import { FileText, LogOut, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

const UserProfileDropdown = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const getInitials = (name: string) => {
    if (!name || typeof name !== "string") {
      return "";
    }
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  const handleSignOut = () => {
    toast.promise(
      authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/");
          },
        },
      }),
      {
        loading: "Signing out...",
        success: "Signed out successfully",
        error: "Failed to sign out",
      },
    );
  };

  if (!session || !user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 rounded-full"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ""} alt={user.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-popover border border-border shadow-lg z-50"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            {user?.displayUsername && (
              <p className="text-xs leading-none text-primary">
                @{user?.displayUsername}
              </p>
            )}
            {/* <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p> */}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            className="flex items-center gap-2 cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/my-submissions"
            className="flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>My Submissions</span>
          </Link>
        </DropdownMenuItem>
        {/* <DropdownMenuItem asChild>
                    <Link to="/my-interview-experiences" className="flex items-center gap-2 cursor-pointer">
                        <MessageSquareText className="w-4 h-4" />
                        <span>My Experiences</span>
                    </Link>
                </DropdownMenuItem> */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          //   onClick={handleSignOut}
          onSelect={handleSignOut}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfileDropdown;
