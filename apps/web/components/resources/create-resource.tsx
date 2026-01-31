"use client";
import toast from "react-hot-toast";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { resourceInputUrlSchema } from "@/lib/schema";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
import { Plus, Loader2, Sparkles, Link } from "lucide-react";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { autoFillResourceDetails } from "@/lib/http";
import CreateResourceForm from "./create-resource-form";

const CreateResource = () => {
  const [open, setOpen] = useQueryState(
    "createResource",
    parseAsBoolean.withDefault(false),
  );
  const [step, setStep] = useState<"url" | "details">("url");
  const [autoFillResourceDetailsData, setAutoFillResourceDetailsData] =
    useState<any>(null);
  const [detailsFormPending, setDetailsFormPending] = useState(false);
  const {
    mutate: autoFillResourceDetailsMutation,
    isPending: isAutoFillResourceDetailsLoading,
  } = useMutation({
    mutationFn: async (url: string) => {
      const response = await autoFillResourceDetails(url);
      return response.data;
    },
    onSuccess: (data) => {
      setAutoFillResourceDetailsData(data?.data);
      toast.success("Resource details fetched successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to fetch resource details. Please try again.");
    },
    onSettled: () => {
      setStep("details");
    },
  });

  const urlForm = useForm({
    defaultValues: {
      url: "",
    },
    validators: {
      onChange: resourceInputUrlSchema,
    },
    onSubmit: async ({ value }) => {
      autoFillResourceDetailsMutation(value.url);
    },
  });

  const resetForm = () => {
    urlForm.reset();
    setStep("url");
    setAutoFillResourceDetailsData(null);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Submit Resource</span>
          <span className="sm:hidden">Submit</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full min-w-[50%] sm:max-w-2xl p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Submit a Resource
            </SheetTitle>
            <SheetDescription>
              {step === "url"
                ? "Start by pasting the URL of the resource you want to share."
                : "Review and complete the details for your resource."}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6">
              {step === "url" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    urlForm.handleSubmit();
                  }}
                >
                  <FieldGroup>
                    <urlForm.Field
                      name="url"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel
                              htmlFor={field.name}
                              className="flex items-center gap-2"
                            >
                              <Link className="w-4 h-4" />
                              Resource URL
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              type="url"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  field.state.meta.isValid
                                ) {
                                  e.preventDefault();
                                  urlForm.handleSubmit();
                                }
                              }}
                              aria-invalid={isInvalid}
                              placeholder="https://example.com/awesome-resource"
                              autoComplete="url"
                              className="h-12 bg-background border-border"
                              disabled={isAutoFillResourceDetailsLoading}
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              We'll try to auto-fill some details based on the
                              URL
                            </p>
                          </Field>
                        );
                      }}
                    />

                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={
                        urlForm.state.isSubmitting ||
                        isAutoFillResourceDetailsLoading
                      }
                    >
                      {isAutoFillResourceDetailsLoading ||
                      urlForm.state.isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Fetching details...
                        </>
                      ) : (
                        <>
                          Continue
                          <Sparkles className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </FieldGroup>
                </form>
              ) : (
                <CreateResourceForm
                  resourceAutoFillData={autoFillResourceDetailsData}
                  onPendingChange={setDetailsFormPending}
                />
              )}
            </div>
          </ScrollArea>
          {/* Fixed footer actions */}
          {step === "details" && (
            <div className="p-6 pt-4 border-t bg-background">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("url")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  form="create-resource-details-form"
                  className="flex-1 gap-2"
                  disabled={detailsFormPending}
                >
                  {detailsFormPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Resource"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateResource;
