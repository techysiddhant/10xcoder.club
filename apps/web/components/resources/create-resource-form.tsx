"use client";
import {
  ResourceCreateClient,
  resourceCreateSchema,
  ResourceType,
} from "@/lib/schema";
import { useForm } from "@tanstack/react-form";
import { ResourceAutoFillData } from "@workspace/database";
import { ResourceLanguage } from "@workspace/schemas";
import { useEffect, useRef, useState } from "react";
import { Field, FieldError, FieldGroup } from "@workspace/ui/components/field";
import { FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@workspace/ui/components/select";
import { ImagePlus, Loader2, Trash, X } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Dialog, DialogContent } from "@workspace/ui/components/dialog";
import { createResource, resourceOptions, uploadImage } from "@/lib/http";
import { useMutation, useQuery } from "@tanstack/react-query";
import { uploadToS3 } from "@/lib/utils";
import toast from "react-hot-toast";
import { Editor } from "../editor/dynamic-editor";
import { useRouter } from "next/navigation";
interface CreateResourceFormProps {
  resourceAutoFillData: ResourceAutoFillData;
  onPendingChange?: (pending: boolean) => void;
}

const CreateResourceForm = ({
  resourceAutoFillData,
  onPendingChange,
}: CreateResourceFormProps) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    resourceAutoFillData?.image ?? null,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [tagsDuplicateMessage, setTagsDuplicateMessage] = useState<
    string | null
  >(null);
  const [techStackDuplicateMessage, setTechStackDuplicateMessage] = useState<
    string | null
  >(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const form = useForm({
    defaultValues: {
      url: resourceAutoFillData?.url ?? "",
      title: resourceAutoFillData?.title || "",
      description: resourceAutoFillData?.description || undefined,
      credits: resourceAutoFillData?.credits || undefined,
      resourceType: resourceAutoFillData?.resourceType || "",
      language:
        (resourceAutoFillData?.language as ResourceLanguage) ?? "english",
      image: resourceAutoFillData?.image ?? "",
      tags: resourceAutoFillData?.tags ?? [],
      techStack: resourceAutoFillData?.techStack ?? [],
    },
    validators: {
      onChange: ({ value }) => {
        const result = resourceCreateSchema.safeParse(value);
        if (!result.success) {
          return result.error.formErrors.fieldErrors;
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      createResourceMutation({
        ...value,
      });
    },
  });

  const { mutate: uploadImageMutation, isPending: isUploadImageLoading } =
    useMutation({
      mutationFn: uploadImage,
      onSuccess: async (data) => {
        const fileToUpload = imageFile;
        if (!fileToUpload) {
          form.setFieldValue("image", () => "");
          return;
        }
        try {
          await uploadToS3(fileToUpload, data.data.uploadUrl);
          form.setFieldValue("image", () => data.data.key);
        } catch {
          setImagePreview(null);
          setImageFile(null);
          form.setFieldValue("image", () => "");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          toast.error("Failed to upload image. Please try again.");
        }
      },
      onError: () => {
        setImagePreview(null);
        setImageFile(null);
        form.setFieldValue("image", () => "");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        toast.error("Failed to upload image. Please try again.");
      },
    });
  const { mutate: createResourceMutation, isPending: isCreateResourceLoading } =
    useMutation({
      mutationFn: (resource: ResourceCreateClient) =>
        createResource({
          ...resource,
        }),
      onSuccess: (data) => {
        toast.success("Resource created successfully");
        form.reset();
        router.push(`/resources/${data.data.id}`);
      },
      onError: (error) => {
        toast.error("Failed to create resource. Please try again.");
      },
    });
  const isPending = isUploadImageLoading || isCreateResourceLoading;

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  useEffect(() => {
    if (resourceAutoFillData?.image && !imageFile) {
      setImagePreview(resourceAutoFillData.image);
    }
  }, [resourceAutoFillData?.image, imageFile]);

  // Get URL from autoFill data
  const url = resourceAutoFillData?.url || "";
  const { data: resourceOptionsData } = useQuery({
    queryKey: ["resourceOptions"],
    queryFn: async () => {
      const response = await resourceOptions();
      return response.data.data;
    },
  });
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPending) return;
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      uploadImageMutation({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        folder: "resources",
      });
    }
  };
  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    form.setFieldValue("image", () => "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const formId = "create-resource-details-form";
  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup className="space-y-5">
        {/* URL Preview */}
        {url && (
          <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">URL</p>
            <p className="text-sm text-foreground truncate">{url}</p>
          </div>
        )}

        {/* Image Upload */}
        <div className="space-y-2">
          <FieldLabel>Cover Image</FieldLabel>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isPending}
            className="hidden"
          />
          {imagePreview ? (
            <div className="relative rounded-lg overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => setImageDialogOpen(true)}
                className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg overflow-hidden"
              >
                <img
                  src={imagePreview}
                  alt="Cover preview"
                  className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
              </button>
              <button
                type="button"
                onClick={removeImage}
                disabled={isPending}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <Trash className="w-4 h-4" />
              </button>
              <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                <DialogContent
                  className="sm:max-w-4xl max-h-[90vh] p-2"
                  showCloseButton={true}
                >
                  <img
                    src={imagePreview}
                    alt="Full size cover"
                    className="max-h-[85vh] w-full object-contain rounded-lg"
                  />
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => !isPending && fileInputRef.current?.click()}
              disabled={isPending}
              className="w-full h-32 border-2 border-dashed border-border/70 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    {isUploadImageLoading
                      ? "Uploading image..."
                      : "Submitting..."}
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload image
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Title */}
        <form.Field
          name="title"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Title *</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Resource title"
                  className="h-12 bg-background border-border"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        {/* Description */}
        <form.Field
          name="description"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="description-editor">
                  Description
                </FieldLabel>
                <div className="w-full min-h-[300px] border border-border rounded-2xl overflow-hidden">
                  <Editor
                    initialContent={field.state.value}
                    onChange={(content) => field.handleChange(content)}
                  />
                </div>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        {/* Author/Credits */}
        <form.Field
          name="credits"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Author Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Who created this resource?"
                  className="h-12 bg-background border-border"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        {/* Resource Type */}
        <form.Field
          name="resourceType"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Resource Type *</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(
                      () => value as "video" | "blog" | "tool" | "repo",
                    )
                  }
                >
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={isInvalid}
                    className="h-12 bg-background border-border"
                  >
                    <SelectValue placeholder="Select resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceOptionsData?.resourceTypes.map(
                      (type: ResourceType) => (
                        <SelectItem key={type.name} value={type.name}>
                          {type.label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        {/* Language */}
        <form.Field
          name="language"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const value = field.state.value ?? "english";
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Language</FieldLabel>
                <Select
                  value={value}
                  onValueChange={(v) =>
                    field.handleChange(() => v as "english" | "hindi")
                  }
                >
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={isInvalid}
                    className="h-12 bg-background border-border"
                  >
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        {/* Tags (free-text, max 10) */}
        <form.Field
          name="tags"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const tags = field.state.value ?? [];
            const atLimit = tags.length >= 10;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="tags-input">Tags</FieldLabel>
                <div className="space-y-2">
                  <Input
                    id="tags-input"
                    placeholder={
                      atLimit
                        ? "Max 10 tags"
                        : "Type a tag and press Enter or comma"
                    }
                    className="h-12 bg-background border-border"
                    disabled={atLimit}
                    onChange={() => setTagsDuplicateMessage(null)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== ",") return;
                      e.preventDefault();
                      const input = e.currentTarget;
                      const raw = input.value.trim();
                      if (!raw || atLimit) return;
                      const parsed = raw
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const duplicates = parsed.filter((t) => tags.includes(t));
                      const toAdd = parsed
                        .filter((t) => !tags.includes(t))
                        .slice(0, 10 - tags.length);
                      if (duplicates.length > 0) {
                        setTagsDuplicateMessage(
                          duplicates.length === 1
                            ? `Tag "${duplicates[0]}" is already added.`
                            : `Already added: ${duplicates.join(", ")}`,
                        );
                      } else {
                        setTagsDuplicateMessage(null);
                      }
                      if (toAdd.length > 0) {
                        field.handleChange([...tags, ...toAdd]);
                      }
                      input.value = "";
                    }}
                  />
                  {tagsDuplicateMessage && (
                    <p className="text-xs text-destructive">
                      {tagsDuplicateMessage}
                    </p>
                  )}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() =>
                              field.handleChange(tags.filter((t) => t !== tag))
                            }
                            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                            aria-label={`Remove ${tag}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {atLimit && (
                    <p className="text-xs text-muted-foreground">
                      Max 10 tags.
                    </p>
                  )}
                </div>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        {/* Tech stack (free-text, max 4) */}
        <form.Field
          name="techStack"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const techStack = field.state.value ?? [];
            const atLimit = techStack.length >= 4;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="techstack-input">Tech stack</FieldLabel>
                <div className="space-y-2">
                  <Input
                    id="techstack-input"
                    placeholder={
                      atLimit
                        ? "Max 4 tech stack items"
                        : "Type and press Enter or comma"
                    }
                    className="h-12 bg-background border-border"
                    disabled={atLimit}
                    onChange={() => setTechStackDuplicateMessage(null)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== ",") return;
                      e.preventDefault();
                      const input = e.currentTarget;
                      const raw = input.value.trim();
                      if (!raw || atLimit) return;
                      const parsed = raw
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const duplicates = parsed.filter((t) =>
                        techStack.includes(t),
                      );
                      const toAdd = parsed
                        .filter((t) => !techStack.includes(t))
                        .slice(0, 4 - techStack.length);
                      if (duplicates.length > 0) {
                        setTechStackDuplicateMessage(
                          duplicates.length === 1
                            ? `"${duplicates[0]}" is already added.`
                            : `Already added: ${duplicates.join(", ")}`,
                        );
                      } else {
                        setTechStackDuplicateMessage(null);
                      }
                      if (toAdd.length > 0) {
                        field.handleChange([...techStack, ...toAdd]);
                      }
                      input.value = "";
                    }}
                  />
                  {techStackDuplicateMessage && (
                    <p className="text-xs text-destructive">
                      {techStackDuplicateMessage}
                    </p>
                  )}
                  {techStack.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {techStack.map((item) => (
                        <Badge
                          key={item}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() =>
                              field.handleChange(
                                techStack.filter((t) => t !== item),
                              )
                            }
                            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                            aria-label={`Remove ${item}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {atLimit && (
                    <p className="text-xs text-muted-foreground">
                      Max 4 tech stack items.
                    </p>
                  )}
                </div>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>
    </form>
  );
};

export default CreateResourceForm;
