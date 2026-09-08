import { useTheme } from "next-themes";
import { AlertTriangle, CheckCircle2, Info, LoaderCircle, XOctagon } from 'lucide-react';
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position='top-right'
      closeButton
      icons={{
        success: <CheckCircle2 className='h-5 w-5 text-emerald-600' />,
        warning: <AlertTriangle className='h-5 w-5 text-amber-600' />,
        info: <Info className='h-5 w-5 text-brand-blue' />,
        error: <XOctagon className='h-5 w-5 text-red-600' />,
        loading: <LoaderCircle className='h-5 w-5 animate-spin text-brand-blue' />,
      }}
      toastOptions={{
        duration: 5200,
        classNames: {
          toast:
            "group toast !items-start !gap-3 !rounded-[18px] !border !border-brand-ink/10 !bg-background/95 !px-4 !py-4 !pr-11 !text-brand-ink !shadow-[0_20px_55px_-28px_rgba(10,52,78,0.5)] !backdrop-blur-xl",
          title: '!text-sm !font-semibold !leading-5',
          description: "!text-sm !leading-5 !text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: '!right-2 !top-2 !left-auto !h-7 !w-7 !translate-x-0 !translate-y-0 !border-0 !bg-transparent !text-muted-foreground hover:!bg-secondary hover:!text-brand-ink',
          success: '!border-emerald-200',
          warning: '!border-amber-200',
          info: '!border-sky-200',
          error: '!border-red-200',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
