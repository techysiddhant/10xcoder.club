import React from "react";
import type { Metadata } from "next";
import Profile from "./profile";

export const metadata: Metadata = {
  title: "Profile",
  description:
    "Manage your 10xCoder.club profile, display name, username, and profile picture.",
};

const ProfilePage = () => {
  return <Profile />;
};

export default ProfilePage;
