import AddProductForm from "./add-product-form";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Product",
  description:
    "Add new products page. A fast and efficient product addition process using Next.js and Tailwind CSS. User-friendly interface with easily editable form fields."
};

export default function Page() {
  return (
    <div className="mx-auto max-w-(--breakpoint-lg)">
      <div className="space-y-4">
        <AddProductForm />
      </div>
    </div>
  );
}
