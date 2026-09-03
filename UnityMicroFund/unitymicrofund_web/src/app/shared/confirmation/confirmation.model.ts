export interface ConfirmationOptions {
  title: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: string;
}

export interface ConfirmationResult {
  confirmed: boolean;
}
