import OriginalPage, * as Original from "../../admin/page";
import { safeMetadataImport } from "@/lib/safeExport";

export const { metadata } = safeMetadataImport(Original);

export default OriginalPage;

export async function generateStaticParams() {
  return ["en", "fr", "es", "ru", "uk", "zh"].map((locale) => ({ locale }));
}
