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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path
                    d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                    fill="currentColor"
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
