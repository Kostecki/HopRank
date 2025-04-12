import { notifications } from "@mantine/notifications";

enum Variants {
  "success" = "green",
  "warning" = "yellow",
  "danger" = "red",
}

const showToast = (
  title: string,
  message: string,
  variant: keyof typeof Variants,
  withBorder = true,
  autoClose = 4000 // Mantine default
) => {
  notifications.show({
    title,
    message,
    color: Variants[variant],
    withBorder,
    autoClose,
  });
};

const showSuccessToast = (
  message: string,
  title = "Succes!",
  autoClose?: number
) => {
  showToast(title, message, "success", false, autoClose);
};
const showWarningToast = (message: string, autoClose?: number) => {
  showToast("Warning", message, "warning", false, autoClose);
};
const showDangerToast = (
  message: string,
  title = "Noget gik galt!",
  autoClose?: number
) => {
  showToast(title, message, "danger", false, autoClose);
};

export { showSuccessToast, showWarningToast, showDangerToast };
