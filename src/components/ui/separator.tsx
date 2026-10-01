import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
export function Separator({ className, ...props }: HTMLAttributes<HTMLHRElement>) { return <hr className={cn("border-0 border-t", className)} {...props} />; }
