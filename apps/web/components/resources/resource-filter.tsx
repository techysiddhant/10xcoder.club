import { useState, useMemo } from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@/lib/utils";
import { resourceOptions } from "@/lib/http";

interface ResourceFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  selectedTechStack: string[];
  onTechStackChange: (techStack: string[]) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onClearAll: () => void;
}

const ResourceFilter = ({
  searchQuery,
  onSearchChange,
  selectedTypes,
  onTypesChange,
  selectedTechStack,
  onTechStackChange,
  selectedTags,
  onTagsChange,
  onClearAll,
}: ResourceFilterProps) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: optionsData } = useQuery({
    queryKey: ["resourceOptions"],
    queryFn: async () => {
      const res = await resourceOptions();
      return (
        res.data as {
          data: {
            resourceTypes: { id: string; name: string; label: string }[];
            tags: { id: string; name: string }[];
            techStack: { id: string; name: string }[];
          };
        }
      ).data;
    },
  });

  const resourceTypes = useMemo(
    () =>
      (optionsData?.resourceTypes ?? []).map((t) => ({
        value: t.name,
        label: (t as { label?: string }).label ?? t.name,
      })),
    [optionsData],
  );
  const techStacks = useMemo(
    () => (optionsData?.techStack ?? []).map((t) => t.name),
    [optionsData],
  );
  const tagOptions = useMemo(
    () =>
      (optionsData?.tags ?? []).map((t) => ({ value: t.name, label: t.name })),
    [optionsData],
  );

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedTechStack.length > 0 ||
    selectedTags.length > 0;
  const totalFilters =
    selectedTypes.length + selectedTechStack.length + selectedTags.length;

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const toggleTechStack = (tech: string) => {
    if (selectedTechStack.includes(tech)) {
      onTechStackChange(selectedTechStack.filter((t) => t !== tech));
    } else {
      onTechStackChange([...selectedTechStack, tech]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10 h-12 bg-card border-border/50 focus:border-primary/50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Mobile Filter Toggle */}
      <div className="flex items-center gap-2 md:hidden">
        <Button
          variant="outline"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="flex-1 justify-between"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {totalFilters > 0 && (
              <Badge variant="secondary" className="ml-1">
                {totalFilters}
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              showMobileFilters && "rotate-180",
            )}
          />
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Desktop Filters */}
      <div className={cn("flex-wrap gap-2", "hidden md:flex")}>
        {/* Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Type
              {selectedTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5">
                  {selectedTypes.length}
                </Badge>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {resourceTypes.map((type) => (
              <DropdownMenuCheckboxItem
                key={type.value}
                checked={selectedTypes.includes(type.value)}
                onCheckedChange={() => toggleType(type.value)}
              >
                {type.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tech Stack Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Tech Stack
              {selectedTechStack.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5">
                  {selectedTechStack.length}
                </Badge>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-48 max-h-64 overflow-y-auto"
          >
            {techStacks.map((tech) => (
              <DropdownMenuCheckboxItem
                key={tech}
                checked={selectedTechStack.includes(tech)}
                onCheckedChange={() => toggleTechStack(tech)}
              >
                {tech}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tags Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Tags
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5">
                  {selectedTags.length}
                </Badge>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-48 max-h-64 overflow-y-auto"
          >
            {tagOptions.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={selectedTags.includes(opt.value)}
                onCheckedChange={() => {
                  if (selectedTags.includes(opt.value)) {
                    onTagsChange(selectedTags.filter((t) => t !== opt.value));
                  } else {
                    onTagsChange([...selectedTags, opt.value]);
                  }
                }}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-muted-foreground"
          >
            Clear all
            <X className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      {/* Mobile Filters Expanded */}
      {showMobileFilters && (
        <div className="space-y-4 p-4 bg-card rounded-lg border border-border/50 md:hidden">
          {/* Type */}
          <div>
            <h4 className="text-sm font-medium mb-2">Type</h4>
            <div className="flex flex-wrap gap-2">
              {resourceTypes.map((type) => (
                <Badge
                  key={type.value}
                  variant={
                    selectedTypes.includes(type.value) ? "default" : "outline"
                  }
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => toggleType(type.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleType(type.value);
                    }
                  }}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h4 className="text-sm font-medium mb-2">Tech Stack</h4>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {techStacks.map((tech) => (
                <Badge
                  key={tech}
                  variant={
                    selectedTechStack.includes(tech) ? "default" : "outline"
                  }
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => toggleTechStack(tech)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleTechStack(tech);
                    }
                  }}
                >
                  {tech}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h4 className="text-sm font-medium mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {tagOptions.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={
                    selectedTags.includes(opt.value) ? "default" : "outline"
                  }
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => {
                    if (selectedTags.includes(opt.value)) {
                      onTagsChange(selectedTags.filter((t) => t !== opt.value));
                    } else {
                      onTagsChange([...selectedTags, opt.value]);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (selectedTags.includes(opt.value)) {
                        onTagsChange(
                          selectedTags.filter((t) => t !== opt.value),
                        );
                      } else {
                        onTagsChange([...selectedTags, opt.value]);
                      }
                    }
                  }}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedTypes.map((type) => {
            const typeLabel =
              resourceTypes.find((t) => t.value === type)?.label ?? type;
            return (
              <Badge key={type} variant="secondary" className="gap-1">
                {typeLabel}
                <button
                  type="button"
                  onClick={() => toggleType(type)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleType(type);
                    }
                  }}
                  aria-label={`Remove ${typeLabel}`}
                  className="inline-flex p-0.5 rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <X className="w-3 h-3 cursor-pointer" aria-hidden />
                </button>
              </Badge>
            );
          })}
          {selectedTechStack.map((tech) => (
            <Badge key={tech} variant="secondary" className="gap-1">
              {tech}
              <button
                type="button"
                onClick={() => toggleTechStack(tech)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleTechStack(tech);
                  }
                }}
                aria-label={`Remove ${tech}`}
                className="inline-flex p-0.5 rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <X className="w-3 h-3 cursor-pointer" aria-hidden />
              </button>
            </Badge>
          ))}
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() =>
                  onTagsChange(selectedTags.filter((t) => t !== tag))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onTagsChange(selectedTags.filter((t) => t !== tag));
                  }
                }}
                aria-label={`Remove ${tag}`}
                className="inline-flex p-0.5 rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <X className="w-3 h-3 cursor-pointer" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourceFilter;
