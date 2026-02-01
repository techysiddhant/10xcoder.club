"use client";

import { User as UserType } from "@workspace/database";
import { useForm } from "@tanstack/react-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Button } from "@workspace/ui/components/button";
import { Loader2, User, AtSign } from "lucide-react";
import { ProfileUpdateSchema } from "@workspace/schemas";
import { authClient } from "@/lib/auth-client";
import toast from "react-hot-toast";

const ProfileDetails = ({ user }: { user: UserType }) => {
  const { refetch } = authClient.useSession();
  const defaultValues = {
    name: user.name ?? "",
    username: (user.username ?? user.displayUsername ?? "") as string,
  };

  const form = useForm({
    defaultValues,
    validators: {
      onChange: ProfileUpdateSchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.updateUser(
        {
          name: value.name,
          username: value.username,
        },
        {
          disableSignal: true,
          onSuccess() {
            // Manually refetch session if needed
            refetch();
            toast.success("Profile updated successfully");
          },
          onError(error) {
            toast.error("Failed to update profile. Please try again.");
          },
        },
      );
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile Information</CardTitle>
        <CardDescription>Update your profile details</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup className="space-y-4">
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel
                      htmlFor={field.name}
                      className="flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Display Name
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Enter your display name"
                      className="mt-2"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="username">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel
                      htmlFor={field.name}
                      className="flex items-center gap-2"
                    >
                      <AtSign className="w-4 h-4" />
                      Username
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, ""),
                        )
                      }
                      aria-invalid={isInvalid}
                      placeholder="Choose a unique username"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Only lowercase letters, numbers, and underscores allowed
                    </p>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <Separator className="my-4" />

            <div className="flex justify-end">
              <form.Subscribe
                selector={(state) => ({
                  isSubmitting: state.isSubmitting,
                  isDirty: state.isDirty,
                  canSubmit: state.canSubmit,
                })}
              >
                {({ isSubmitting, isDirty, canSubmit }) => (
                  <Button
                    type="submit"
                    disabled={isSubmitting || !isDirty || !canSubmit}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileDetails;
