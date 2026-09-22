import { submissions } from "@wix/forms";
import { CONTACT_FORM_ID } from "./constants";

export type FormValues = Record<string, string | string[] | number | boolean>;

export async function submitContactForm(
  values: FormValues,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { status } = await submissions.createSubmission({
      formId: CONTACT_FORM_ID,
      submissions: values,
    });
    return { success: status === "PENDING" || status === "CONFIRMED" };
  } catch (error) {
    console.error("Form submission error:", error);
    return {
      success: false,
      error: "We couldn't send your message. Please try again, or call or visit the post.",
    };
  }
}
