"use client";

import * as React from "react";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import Image from "next/image";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MenuContentEditor } from "@/components/dashboard/menu-content-editor";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { useMenusModel } from "@/hooks/use-menus-model";
import { uploadMenuImageToSupabase, deleteMenuImageFromSupabase } from "@/lib/convex-upload";
import { getErrorMessageFromResponse, normalizeNetworkErrorMessage } from "@/lib/http";
import type { Location, Menu, Tag } from "@/lib/read-model";
import { centsToEurosString, eurosStringToCents } from "@/lib/money";
import { patchMenu } from "@/hooks/use-bootstrap-data";

const addMenuSchema = z
  .object({
    title: z.string().trim().min(1, "Titel ist erforderlich"),
    description: z.string().trim().optional(),
    menuContent: z.string().trim().min(1, "Menüinhalt ist erforderlich"),
    menuContentHtml: z.string().optional(),
    status: z.enum(["active", "archived"]).default("active"),
    tagIds: z.array(z.string()).default([]),
    locationIds: z.array(z.string()).default([]),
    priceEuros: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const raw = val.priceEuros ?? "";
    if (!raw.trim()) return;
    const cents = eurosStringToCents(raw);
    if (cents == null) {
      ctx.addIssue({
        code: "custom",
        path: ["priceEuros"],
        message: "Ungültiger Preis",
      });
    }
  });

type AddMenuFormValues = z.infer<typeof addMenuSchema>;

export type AddMenuDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu?: Menu | null;
};

export function AddMenuDialog({ open, onOpenChange, menu = null }: AddMenuDialogProps) {
  const { model, refresh } = useMenusModel();

  const isEdit = Boolean(menu);

  const openerRef = React.useRef<HTMLElement | null>(null);

  if (open && !openerRef.current && typeof document !== "undefined") {
    openerRef.current = document.activeElement as HTMLElement | null;
  }

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const dialogContentRef = React.useRef<HTMLDivElement | null>(null);

  const form = useForm<AddMenuFormValues>({
    resolver: zodResolver(addMenuSchema),
    defaultValues: {
      title: "",
      description: "",
      menuContent: "",
      menuContentHtml: "",
      status: "active",
      tagIds: [],
      locationIds: [],
      priceEuros: "",
    },
    mode: "onSubmit",
  });

  React.useEffect(() => {
    form.register("tagIds");
    form.register("locationIds");
    form.register("menuContent");
    form.register("menuContentHtml");
  }, [form]);

  type Option = { value: string; label: string };

  const [extraTags, setExtraTags] = React.useState<Tag[]>([]);
  const [extraLocations, setExtraLocations] = React.useState<Location[]>([]);

  const [menuId, setMenuId] = React.useState<string | null>(null);
  const [imageUploading, setImageUploading] = React.useState(false);
  const [imagePath, setImagePath] = React.useState<string | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [originalImagePath, setOriginalImagePath] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (menu) {
      setMenuId(menu.id);
      setImagePath(menu.imagePath);
      setImageUrl(menu.imageUrl);
      setOriginalImagePath(menu.imagePath);
      form.reset({
        title: menu.title,
        description: menu.description ?? "",
        menuContent: menu.menuContent,
        menuContentHtml: menu.menuContentHtml ?? "",
        status: menu.status,
        tagIds: menu.tagIds,
        locationIds: menu.locationIds,
        priceEuros:
          menu.pricePerPersonCents != null
            ? centsToEurosString(menu.pricePerPersonCents).replace(".", ",")
            : "",
      });
      setTagRows(menu.tagIds.length > 0 ? menu.tagIds : [""]);
      setLocationRows(menu.locationIds.length > 0 ? menu.locationIds : [""]);
      setTagQueries({});
      setLocationQueries({});
      setExtraTags([]);
      setExtraLocations([]);
      return;
    }

    setMenuId((prev) => prev ?? crypto.randomUUID());
    setOriginalImagePath(null);
  }, [form, menu, open]);

  const tagOptions = React.useMemo<Option[]>(() => {
    const byId = new Map<string, Option>();
    model.tags.forEach((t) => byId.set(t.id, { value: t.id, label: t.name }));
    extraTags.forEach((t) => {
      if (!byId.has(t.id)) {
        byId.set(t.id, { value: t.id, label: t.name });
      }
    });
    return Array.from(byId.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [extraTags, model.tags]);

  const locationOptions = React.useMemo<Option[]>(() => {
    const byId = new Map<string, Option>();
    model.locations.forEach((l) =>
      byId.set(l.id, { value: l.id, label: l.name }),
    );
    extraLocations.forEach((l) => {
      if (!byId.has(l.id)) {
        byId.set(l.id, { value: l.id, label: l.name });
      }
    });
    return Array.from(byId.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [extraLocations, model.locations]);

  const tagById = React.useMemo(() => {
    const map = new Map<string, Option>();
    tagOptions.forEach((o) => map.set(o.value, o));
    return map;
  }, [tagOptions]);

  const locationById = React.useMemo(() => {
    const map = new Map<string, Option>();
    locationOptions.forEach((o) => map.set(o.value, o));
    return map;
  }, [locationOptions]);

  const [tagRows, setTagRows] = React.useState<string[]>([""]);
  const [locationRows, setLocationRows] = React.useState<string[]>([""]);
  const [tagQueries, setTagQueries] = React.useState<Record<number, string>>({});
  const [locationQueries, setLocationQueries] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    if (!open) {
      const el = openerRef.current;
      openerRef.current = null;
      if (el && typeof document !== "undefined" && document.contains(el)) {
        el.focus();
      }

      if (imagePath) {
        if (!originalImagePath || imagePath !== originalImagePath) {
          void deleteMenuImageFromSupabase(imagePath).catch(() => {
            // ignore
          });
        }
      }
      form.reset();
      setTagRows([""]);
      setLocationRows([""]);
      setTagQueries({});
      setLocationQueries({});
      setExtraTags([]);
      setExtraLocations([]);
      setMenuId(null);
      setImagePath(null);
      setImageUrl(null);
      setImageUploading(false);
      setOriginalImagePath(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [form, imagePath, open, originalImagePath]);

  React.useEffect(() => {
    const ids = Array.from(new Set(tagRows.filter(Boolean)));
    form.setValue("tagIds", ids, { shouldDirty: true });
  }, [form, tagRows]);

  React.useEffect(() => {
    const ids = Array.from(new Set(locationRows.filter(Boolean)));
    form.setValue("locationIds", ids, { shouldDirty: true });
  }, [form, locationRows]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const createTag = React.useCallback(
    async (name: string): Promise<Tag | null> => {
      try {
        const res = await fetch("/api/tags", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name }),
        });

        if (!res.ok) {
          const message = await getErrorMessageFromResponse(
            res,
            `Tag konnte nicht erstellt werden (${res.status})`,
          );
          toast.error(message);
          return null;
        }

        const tag = (await res.json()) as Tag;
        setExtraTags((prev) =>
          prev.some((t) => t.id === tag.id) ? prev : [...prev, tag],
        );
        refresh();
        return tag;
      } catch (error: unknown) {
        const message = normalizeNetworkErrorMessage(error, "Tag konnte nicht erstellt werden");
        toast.error(message);
        return null;
      }
    },
    [refresh],
  );

  const handleUploadImage = React.useCallback(
    async (file: File) => {
      const id = menuId ?? crypto.randomUUID();
      if (!menuId) {
        setMenuId(id);
      }

      try {
        setImageUploading(true);
        const replacePath =
          imagePath && (!originalImagePath || imagePath !== originalImagePath)
            ? imagePath
            : null;
        const result = await uploadMenuImageToSupabase({
          file,
          menuId: id,
          existingPath: replacePath,
        });
        setImagePath(result.path);
        setImageUrl(result.publicUrl);
      } catch (e) {
        const message = normalizeNetworkErrorMessage(e, "Upload fehlgeschlagen");
        toast.error(message);
      } finally {
        setImageUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [imagePath, menuId, originalImagePath],
  );

  const handleRemoveImage = React.useCallback(async () => {
    if (!imagePath) return;

    if (isEdit && originalImagePath && imagePath === originalImagePath) {
      setImagePath(null);
      setImageUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    try {
      setImageUploading(true);
      await deleteMenuImageFromSupabase(imagePath);
      setImagePath(null);
      setImageUrl(null);
    } catch (e) {
      const message = normalizeNetworkErrorMessage(e, "Löschen fehlgeschlagen");
      toast.error(message);
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [imagePath, isEdit, originalImagePath]);

  const createLocation = React.useCallback(
    async (name: string): Promise<Location | null> => {
      try {
        const res = await fetch("/api/locations", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name }),
        });

        if (!res.ok) {
          const message = await getErrorMessageFromResponse(
            res,
            `Standort konnte nicht erstellt werden (${res.status})`,
          );
          toast.error(message);
          return null;
        }

        const location = (await res.json()) as Location;
        setExtraLocations((prev) =>
          prev.some((l) => l.id === location.id) ? prev : [...prev, location],
        );
        refresh();
        return location;
      } catch (error: unknown) {
        const message = normalizeNetworkErrorMessage(
          error,
          "Standort konnte nicht erstellt werden",
        );
        toast.error(message);
        return null;
      }
    },
    [refresh],
  );

  const onSubmit = React.useCallback(
    async (values: AddMenuFormValues) => {
      const id = menuId ?? crypto.randomUUID();
      if (!menuId) {
        setMenuId(id);
      }

      const cents = eurosStringToCents(values.priceEuros ?? "");
      if ((values.priceEuros ?? "").trim() && cents == null) {
        toast.error("Ungültiger Preis");
        return;
      }

      if (menu) {
        try {
          const res = await fetch(`/api/menus/${menu.id}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              title: values.title,
              description: values.description,
              menuContent: values.menuContent,
              menuContentHtml: values.menuContentHtml?.trim()
                ? values.menuContentHtml.trim()
                : null,
              status: values.status,
              pricePerPersonCents: cents,
              imagePath,
              tagIds: values.tagIds,
              locationIds: values.locationIds,
            }),
          });

          if (!res.ok) {
            const message = await getErrorMessageFromResponse(
              res,
              `Menü konnte nicht gespeichert werden (${res.status})`,
            );
            toast.error(message);
            return;
          }

          const json = (await res.json()) as {
            id: string;
            title?: string;
            description?: string | null;
            menuContent?: string;
            menuContentHtml?: string | null;
            pricePerPersonCents?: number | null;
            imagePath?: string | null;
            imageUrl?: string | null;
            status: "active" | "archived";
            deletedAt: string | null;
            updatedAt: string;
            tagIds?: string[];
            locationIds?: string[];
          };

          patchMenu(menu.id, {
            title: json.title ?? values.title.trim(),
            description:
              typeof json.description !== "undefined"
                ? json.description
                : values.description?.trim()
                  ? values.description.trim()
                  : null,
            menuContent: json.menuContent ?? values.menuContent.trim(),
            menuContentHtml:
              typeof json.menuContentHtml !== "undefined"
                ? json.menuContentHtml
                : values.menuContentHtml?.trim()
                  ? values.menuContentHtml.trim()
                  : null,
            pricePerPersonCents:
              typeof json.pricePerPersonCents !== "undefined"
                ? json.pricePerPersonCents
                : cents ?? null,
            imagePath:
              typeof json.imagePath !== "undefined" ? json.imagePath : imagePath,
            imageUrl:
              typeof json.imageUrl !== "undefined" ? json.imageUrl : imageUrl,
            status: json.status,
            deletedAt: json.deletedAt,
            updatedAt: json.updatedAt,
            tagIds: json.tagIds ?? values.tagIds,
            locationIds: json.locationIds ?? values.locationIds,
          });

          if (originalImagePath && originalImagePath !== imagePath) {
            void deleteMenuImageFromSupabase(originalImagePath).catch(() => {
              // ignore
            });
          }
        } catch (error: unknown) {
          const message = normalizeNetworkErrorMessage(
            error,
            "Menü konnte nicht gespeichert werden",
          );
          toast.error(message);
          return;
        }

        toast.success("Menü gespeichert");

        setImagePath(null);
        setImageUrl(null);
        refresh();
        onOpenChange(false);
        return;
      }

      try {
        const res = await fetch("/api/menus", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            id,
            title: values.title,
            description: values.description,
            menuContent: values.menuContent,
            menuContentHtml: values.menuContentHtml?.trim()
              ? values.menuContentHtml.trim()
              : null,
            status: values.status,
            pricePerPersonCents: cents,
            imagePath,
            tagIds: values.tagIds,
            locationIds: values.locationIds,
          }),
        });

        if (!res.ok) {
          const message = await getErrorMessageFromResponse(
            res,
            `Menü konnte nicht erstellt werden (${res.status})`,
          );
          toast.error(message);
          return;
        }
      } catch (error: unknown) {
        const message = normalizeNetworkErrorMessage(
          error,
          "Menü konnte nicht erstellt werden",
        );
        toast.error(message);
        return;
      }

      toast.success("Menü erstellt");

      setImagePath(null);
      setImageUrl(null);
      refresh();
      onOpenChange(false);
    },
    [
      imagePath,
      imageUrl,
      menu,
      menuId,
      onOpenChange,
      originalImagePath,
      refresh,
    ],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogContentRef}
        className="flex max-h-[80vh] min-h-0 flex-col gap-0 p-0"
      >
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Menü bearbeiten" : "Menü hinzufügen"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Menüdetails bearbeiten." : "Neues Menü erstellen."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        >
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="add-menu-title">
                Titel
              </label>
              <Input
                id="add-menu-title"
                placeholder="z.B. Mittagsangebote"
                aria-invalid={Boolean(errors.title)}
                {...register("title")}
              />
              {errors.title?.message ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="add-menu-price">
                Preis (EUR) / Person
              </label>
              <Input
                id="add-menu-price"
                placeholder="z.B. 12,50"
                inputMode="decimal"
                aria-invalid={Boolean(errors.priceEuros)}
                {...register("priceEuros")}
              />
              {errors.priceEuros?.message ? (
                <p className="text-sm text-destructive">{errors.priceEuros.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="add-menu-image">
                Bild
              </label>

              <div className="rounded-md border bg-muted/20 overflow-hidden">
                <div className="relative h-32">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt="Menübild"
                      fill
                      sizes="(max-width: 768px) 100vw, 600px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                      Kein Bild
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  id="add-menu-image"
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={isSubmitting || imageUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) return;
                    void handleUploadImage(file);
                  }}
                />
                {imagePath ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting || imageUploading}
                    onClick={() => void handleRemoveImage()}
                  >
                    Entfernen
                  </Button>
                ) : null}
              </div>

              {imageUploading ? (
                <p className="text-xs text-muted-foreground">Wird verarbeitet…</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="add-menu-description"
              >
                Beschreibung
              </label>
              <Input
                id="add-menu-description"
                placeholder="Optional"
                aria-invalid={Boolean(errors.description)}
                {...register("description")}
              />
              {errors.description?.message ? (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="add-menu-content"
              >
                Menüinhalt
              </label>
              <MenuContentEditor
                id="add-menu-content"
                placeholder="Menütext hier einfügen…"
                className="min-h-32"
                ariaInvalid={Boolean(errors.menuContent)}
                editorKey={menuId ?? "new"}
                initialPlainText={form.getValues("menuContent")}
                initialHtml={form.getValues("menuContentHtml")}
                onBlur={() => void form.trigger("menuContent")}
                onChange={({ plainText, html }) => {
                  form.setValue("menuContent", plainText, { shouldDirty: true });
                  form.setValue("menuContentHtml", html, { shouldDirty: true });
                }}
              />
              {errors.menuContent?.message ? (
                <p className="text-sm text-destructive">
                  {errors.menuContent.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Tags</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Tag hinzufügen"
                  title="Tag hinzufügen"
                  onClick={() => setTagRows((prev) => [...prev, ""])}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {tagRows.map((selectedId, index) => {
                  const selected = selectedId ? tagById.get(selectedId) ?? null : null;
                  const query = tagQueries[index] ?? "";
                  const canCreate =
                    query.trim().length > 0 &&
                    !tagOptions.some(
                      (t) => t.label.toLowerCase() === query.trim().toLowerCase(),
                    );
                  const selectedSet = new Set(tagRows.filter(Boolean));

                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Combobox
                          items={tagOptions}
                          value={selected}
                          onValueChange={(value) => {
                            const v = value as Option | null;

                            if (v?.value === "__create__") {
                              const name = query.trim();
                              if (!name) return;

                              void (async () => {
                                const created = await createTag(name);
                                if (!created) return;

                                setTagRows((prev) => {
                                  const next = [...prev];
                                  next[index] = created.id;
                                  return next;
                                });
                              })();
                              return;
                            }

                            setTagRows((prev) => {
                              const next = [...prev];
                              next[index] = v?.value ?? "";
                              return next;
                            });
                          }}
                          onInputValueChange={(inputValue) => {
                            setTagQueries((prev) => ({
                              ...prev,
                              [index]: inputValue,
                            }));
                          }}
                          isItemEqualToValue={(a, b) => a.value === b.value}
                          itemToStringLabel={(item) => item.label}
                          itemToStringValue={(item) => item.value}
                          filter={(item, q) =>
                            item.label.toLowerCase().includes(q.toLowerCase())
                          }
                        >
                          <ComboboxInput
                            placeholder="Tag auswählen…"
                            showClear
                            aria-invalid={Boolean(errors.tagIds)}
                          />
                          <ComboboxContent portalContainer={dialogContentRef}>
                            <ComboboxList>
                              {canCreate ? (
                                <ComboboxItem
                                  value={{
                                    value: "__create__",
                                    label: `Erstellen \"${query.trim()}\"`,
                                  }}
                                >
                                  Erstellen &quot;{query.trim()}&quot;
                                </ComboboxItem>
                              ) : null}
                              <ComboboxEmpty>Keine Tags gefunden</ComboboxEmpty>
                              <ComboboxCollection>
                                {(item) => (
                                  <ComboboxItem
                                    key={item.value}
                                    value={item}
                                    disabled={
                                      selectedSet.has(item.value) &&
                                      item.value !== selectedId
                                    }
                                  >
                                    {item.label}
                                  </ComboboxItem>
                                )}
                              </ComboboxCollection>
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      </div>

                      {tagRows.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Tag entfernen"
                          title="Tag entfernen"
                          onClick={() =>
                            setTagRows((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          <X className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Standorte</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Standort hinzufügen"
                  title="Standort hinzufügen"
                  onClick={() => setLocationRows((prev) => [...prev, ""])}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {locationRows.map((selectedId, index) => {
                  const selected = selectedId
                    ? locationById.get(selectedId) ?? null
                    : null;
                  const query = locationQueries[index] ?? "";
                  const canCreate =
                    query.trim().length > 0 &&
                    !locationOptions.some(
                      (l) => l.label.toLowerCase() === query.trim().toLowerCase(),
                    );
                  const selectedSet = new Set(locationRows.filter(Boolean));

                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Combobox
                          items={locationOptions}
                          value={selected}
                          onValueChange={(value) => {
                            const v = value as Option | null;

                            if (v?.value === "__create__") {
                              const name = query.trim();
                              if (!name) return;

                              void (async () => {
                                const created = await createLocation(name);
                                if (!created) return;

                                setLocationRows((prev) => {
                                  const next = [...prev];
                                  next[index] = created.id;
                                  return next;
                                });
                              })();
                              return;
                            }

                            setLocationRows((prev) => {
                              const next = [...prev];
                              next[index] = v?.value ?? "";
                              return next;
                            });
                          }}
                          onInputValueChange={(inputValue) => {
                            setLocationQueries((prev) => ({
                              ...prev,
                              [index]: inputValue,
                            }));
                          }}
                          isItemEqualToValue={(a, b) => a.value === b.value}
                          itemToStringLabel={(item) => item.label}
                          itemToStringValue={(item) => item.value}
                          filter={(item, q) =>
                            item.label.toLowerCase().includes(q.toLowerCase())
                          }
                        >
                          <ComboboxInput
                            placeholder="Standort auswählen…"
                            showClear
                            aria-invalid={Boolean(errors.locationIds)}
                          />
                          <ComboboxContent portalContainer={dialogContentRef}>
                            <ComboboxList>
                              {canCreate ? (
                                <ComboboxItem
                                  value={{
                                    value: "__create__",
                                    label: `Erstellen \"${query.trim()}\"`,
                                  }}
                                >
                                  Erstellen &quot;{query.trim()}&quot;
                                </ComboboxItem>
                              ) : null}
                              <ComboboxEmpty>Keine Standorte gefunden</ComboboxEmpty>
                              <ComboboxCollection>
                                {(item) => (
                                  <ComboboxItem
                                    key={item.value}
                                    value={item}
                                    disabled={
                                      selectedSet.has(item.value) &&
                                      item.value !== selectedId
                                    }
                                  >
                                    {item.label}
                                  </ComboboxItem>
                                )}
                              </ComboboxCollection>
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      </div>

                      {locationRows.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Standort entfernen"
                          title="Standort entfernen"
                          onClick={() =>
                            setLocationRows((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <X className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <input type="hidden" {...register("status")} />
          </div>

          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button type="submit" disabled={isSubmitting || imageUploading}>
              {isEdit ? "Speichern" : "Erstellen"}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Abbrechen
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
