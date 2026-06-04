"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { User } from "@workspace/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Camera, Loader2 } from "lucide-react";
import { uploadImage } from "@/lib/http";
import { uploadToImageKit } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import toast from "react-hot-toast";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const ProfilePicture = ({ user }: { user: User }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const revokeCurrentBlob = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const setPreviewServerUrl = useCallback(
    (url: string | null) => {
      revokeCurrentBlob();
      setPreviewUrl(url);
    },
    [revokeCurrentBlob],
  );

  const setPreviewBlobUrl = useCallback(
    (url: string) => {
      revokeCurrentBlob();
      blobUrlRef.current = url;
      setPreviewUrl(url);
    },
    [revokeCurrentBlob],
  );

  useEffect(() => {
    return () => revokeCurrentBlob();
  }, [revokeCurrentBlob]);

  const displayImage = previewUrl ?? user?.image ?? undefined;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isUploading) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Use JPG, PNG, or WebP.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("File too large. Max size is 2MB.");
      e.target.value = "";
      return;
    }

    const previousPreview = previewUrl ?? user?.image ?? null;
    setIsUploading(true);
    setPreviewServerUrl(null);

    try {
      const { data } = await uploadImage({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        folder: "profiles",
      });

      await uploadToImageKit(file, data);

      if (data.imageUrl) {
        const { error } = await authClient.updateUser({
          image: data.imageUrl,
        });
        if (error) {
          toast.error(error.message ?? "Failed to update profile picture.");
          setPreviewServerUrl(previousPreview);
        } else {
          toast.success("Profile picture updated.");
          setPreviewServerUrl(data.imageUrl);
        }
      } else {
        toast.error("Upload completed but profile photo could not be updated.");
        setPreviewServerUrl(previousPreview);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
      setPreviewServerUrl(previousPreview);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile Picture</CardTitle>
        <CardDescription>
          Your profile picture will be visible to other users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="sr-only"
          aria-label="Upload profile photo"
          onChange={handleFileSelect}
        />
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="w-24 h-24">
              <AvatarImage
                src={displayImage || ""}
                alt={user.name ?? "Profile"}
              />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(user.name ?? "U")}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={isUploading}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:pointer-events-none"
              aria-label="Change photo"
            >
              {isUploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerFileInput}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Upload Photo
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              JPG, PNG, WebP. Max 2MB.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfilePicture;
