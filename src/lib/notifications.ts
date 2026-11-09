import { toast as sonnerToast } from "sonner";

const ACTION_SUCCESS_EVENT = "app:action-success";

export const toast = {
  error(...args: Parameters<typeof sonnerToast.error>) {
    return sonnerToast.error(...args);
  },
  success(message: string) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ACTION_SUCCESS_EVENT, { detail: message }));
    }
  },
};

export { ACTION_SUCCESS_EVENT };
