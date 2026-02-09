"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  Settings,
  Plus,
  Check,
  User,
  LogOut,
  Folder,
  Star,
  Code,
  Palette,
  Wrench,
  BookOpen,
  Sparkles,
  Tag,
  Archive,
  Trash2,
} from "lucide-react";
import { useBookmarksStore } from "@/store/bookmarks-store";
import { collections, tags } from "@/mock-data/bookmarks";

const collectionIcons: Record<string, React.ElementType> = {
  bookmark: Bookmark,
  palette: Palette,
  code: Code,
  wrench: Wrench,
  "book-open": BookOpen,
  sparkles: Sparkles,
};

const navItems = [
  { icon: Star, label: "Favorites", href: "/favorites" },
  { icon: Archive, label: "Archive", href: "/archive" },
  { icon: Trash2, label: "Trash", href: "/trash" },
];

export function BookmarksSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const [collectionsOpen, setCollectionsOpen] = React.useState(true);
  const [tagsOpen, setTagsOpen] = React.useState(true);
  const {
    selectedCollection,
    setSelectedCollection,
    selectedTags,
    toggleTag,
    clearTags,
  } = useBookmarksStore();

  const isHomePage = pathname === "/";

  return (
    <Sidebar collapsible="offcanvas" className="lg:border-r-0!" {...props}>
      <SidebarHeader className="p-5 pb-0">
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
              <div className="size-7 rounded-full overflow-hidden bg-linear-to-br from-blue-400 via-indigo-500 to-violet-500 flex items-center justify-center ring-1 ring-white/40 shadow-lg" />
              <span className="font-medium text-muted-foreground">
                Square UI
              </span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                Workspaces
              </DropdownMenuLabel>
              <DropdownMenuItem>
                <div className="size-5 rounded-full bg-linear-to-br from-blue-400 via-indigo-500 to-violet-500 mr-2" />
                Square UI
                <Check className="size-4 ml-auto" />
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="size-5 rounded-full bg-linear-to-br from-emerald-400 to-cyan-500 mr-2" />
                Personal
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="size-5 rounded-full bg-linear-to-br from-orange-400 to-rose-500 mr-2" />
                Work
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem>
                <Plus className="size-4 mr-2" />
                Create Workspace
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem>
                <User className="size-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="size-4 mr-2" />
                Workspace Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  const supabase = getSupabaseBrowserClient();

                  supabase.auth
                    .signOut()
                    .then((result: { error: { message?: string } | null }) => {
                      const { error } = result;
                      if (error) {
                        throw error;
                      }
                      router.push("/signin");
                      router.refresh();
                    })
                    .catch((error: unknown) => {
                      console.error(error);
                      const message =
                        error instanceof Error
                          ? error.message
                          : "Could not sign out";
                      toast.error(message);
                    });
                }}
              >
                <LogOut className="size-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-5 pt-5">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="flex items-center gap-1.5 px-0 text-[10px] font-semibold tracking-wider text-muted-foreground">
            <button
              onClick={() => setCollectionsOpen(!collectionsOpen)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  !collectionsOpen && "-rotate-90"
                )}
              />
              COLLECTIONS
            </button>
          </SidebarGroupLabel>
          {collectionsOpen && (
            <SidebarGroupContent>
              <SidebarMenu className="mt-2">
                {collections.map((collection) => {
                  const IconComponent =
                    collectionIcons[collection.icon] || Folder;
                  const isActive =
                    isHomePage && selectedCollection === collection.id;
                  return (
                    <SidebarMenuItem key={collection.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="h-[38px]"
                      >
                        <Link
                          href="/"
                          onClick={() => {
                            setSelectedCollection(collection.id);
                            clearTags();
                          }}
                        >
                          <IconComponent className="size-5" />
                          <span className="flex-1">{collection.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {collection.count}
                          </span>
                          {isActive && (
                            <ChevronRight className="size-4 text-muted-foreground opacity-60" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="flex items-center gap-1.5 px-0 text-[10px] font-semibold tracking-wider text-muted-foreground">
            <button
              onClick={() => setTagsOpen(!tagsOpen)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  !tagsOpen && "-rotate-90"
                )}
              />
              TAGS
            </button>
            {selectedTags.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearTags();
                }}
                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </SidebarGroupLabel>
          {tagsOpen && (
            <SidebarGroupContent>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                      selectedTags.includes(tag.id)
                        ? "bg-primary text-primary-foreground"
                        : tag.color
                    )}
                  >
                    <Tag className="size-3" />
                    {tag.name}
                  </button>
                ))}
              </div>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="h-[38px]"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
