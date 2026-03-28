import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-stone-900 group-[.toaster]:border-stone-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-stone-500",
          actionButton:
            "group-[.toast]:bg-orange-600 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-stone-100 group-[.toast]:text-stone-600",
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast }
