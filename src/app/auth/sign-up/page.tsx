"use client";
import {
  Button,
  cn,
  Description,
  Form,
  Input,
  Label,
  Separator,
  TextField,
} from "@heroui/react";
import { ChartBar } from "@gravity-ui/icons";
import { redirect, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.email("Correo inválido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type SignUpSchema = z.infer<typeof signUpSchema>;

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export default function SignUp({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignUpSchema) => {
    const { data, error } = await authClient.signUp.email(
      {
        email: values.email, // user email address
        password: values.password, // user password -> min 8 characters by default
        name: values.name, // user display name
        callbackURL: "/admin/category", // A URL to redirect to after the user verifies their email (optional)
      },
      {
        onRequest: (ctx) => {
          //show loading
          console.log("Loading...");
        },
        onSuccess: (ctx) => {
          //redirect to the dashboard or sign in page
          console.log("Success...");
          router.push("/admin/category"); // pantalla de verificacion de email
        },
        onError: (ctx) => {
          // display the error message
          alert(ctx.error.message);
          console.log("Error...");
        },
      },
    );

    console.log({ data, error });
  };
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className={cn("flex flex-col gap-6", className)} {...props}>
          <Form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/*  <FieldGroup> */}
            <div className="flex flex-col items-center gap-2 text-center">
              <a
                href="#"
                className="flex flex-col items-center gap-2 font-medium"
              >
                <div className="flex size-8 items-center justify-center rounded-md">
                  <ChartBar className="size-6" />
                </div>
                <span className="sr-only">Acme Inc.</span>
              </a>
              <h1 className="text-xl font-bold">Regístrate en Zentlet</h1>
              <Description>
                ¿Ya tienes una cuenta? <a href="/sign-in">Inicia sesión</a>
              </Description>
            </div>
            <TextField>
              <Label htmlFor="">Nombre</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                required
                {...register("name")}
              />
            </TextField>
            <TextField>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                {...register("email")}
              />
            </TextField>
            <TextField>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                {...register("password")}
              />
            </TextField>
            <TextField>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                {...register("confirmPassword")}
              />
            </TextField>
            <Button type="submit" className="w-full">
              Registrarse
            </Button>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <Button variant="outline" type="button">
                <svg viewBox="0 0 1024 1024" fill="none">
                  <path
                    fill="#1b1f23"
                    fill-rule="evenodd"
                    d="M512 0C229.12 0 0 229.12 0 512c0 226.56 146.56 417.92 350.08 485.76 25.6 4.48 35.2-10.88 35.2-24.32 0-12.16-.64-52.48-.64-95.36-128.64 23.68-161.92-31.36-172.16-60.16-5.76-14.72-30.72-60.16-52.48-72.32-17.92-9.6-43.52-33.28-.64-33.92 40.32-.64 69.12 37.12 78.72 52.48 46.08 77.44 119.68 55.68 149.12 42.24 4.48-33.28 17.92-55.68 32.64-68.48-113.92-12.8-232.96-56.96-232.96-252.8 0-55.68 19.84-101.76 52.48-137.6-5.12-12.8-23.04-65.28 5.12-135.68 0 0 42.88-13.44 140.8 52.48 40.96-11.52 84.48-17.28 128-17.28s87.04 5.76 128 17.28c97.92-66.56 140.8-52.48 140.8-52.48 28.16 70.4 10.24 122.88 5.12 135.68 32.64 35.84 52.48 81.28 52.48 137.6 0 196.48-119.68 240-233.6 252.8 18.56 16 34.56 46.72 34.56 94.72 0 68.48-.64 123.52-.64 140.8 0 13.44 9.6 29.44 35.2 24.32C877.44 929.92 1024 737.92 1024 512 1024 229.12 794.88 0 512 0"
                    clip-rule="evenodd"
                  />
                </svg>
                Continuar con GitHub
              </Button>
              <Button variant="outline" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                Continuar con Google
              </Button>
            </div>
            {/*  </FieldGroup> */}
          </Form>
          <Description className="px-6 text-center">
            Al hacer clic en continuar, aceptas nuestros{" "}
            <a href="#">Términos de Servicio</a> y{" "}
            <a href="#">Política de Privacidad</a>.
          </Description>
        </div>
      </div>
    </div>
  );
}
