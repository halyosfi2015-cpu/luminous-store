export type VisualTemplateId = string;

export interface VisualTemplate {
  id: VisualTemplateId;
  nameAr: string;
  nameEn: string;
  methodAr: string;
  methodEn: string;
  referenceImage: string; // URL or /public path for template reference image
  style: string; // e.g., editorial_beauty, minimal_product
  createdAt: string;
  updatedAt: string;
}

export interface VisualMemoryEntry {
  productId: string;
  templateId: VisualTemplateId;
  visualId: string;
  createdAt: string;
  divisionKey: string; // e.g., "skincare:DISCOVERY" or "campaign:xyz"
}

export interface VisualDivision {
  key: string;
  labelAr: string;
  labelEn: string;
  productIds: string[];
}

export interface VisualGenerationRequest {
  productIds: string[];
  templateId: VisualTemplateId;
  divisionKey?: string;
  useExternalResearch?: boolean;
  useChatGPTDesign?: boolean;
  language?: "ar" | "en";
}

export interface VisualGenerationResult {
  visualId: string;
  productIds: string[];
  templateId: VisualTemplateId;
  imageUrl?: string;
  htmlSnapshot?: string;
  createdAt: string;
}
