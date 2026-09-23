"use client";
import {
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import {
  AuthFormHeader,
  AuthSubmitButton,
  SocialSignInButtons,
  TermsNotice,
} from "@/core/components/auth-form";
import { AuthLink } from "@/core/components/auth-transition";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const signUpSchema = z
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

type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const router = useRouter();

  const { register, handleSubmit } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignUpValues) => {
    await authClient.signUp.email(
      {
        email: values.email,
        password: values.password,
        name: values.name,
        callbackURL: "/admin",
      },
      {
        onSuccess: () => {
          router.push("/admin");
        },
        onError: (ctx) => {
          alert(ctx.error.message);
        },
      },
    );
  };
  return (
    <div className="w-full max-w-sm">
      <div>
        <div className="flex flex-col gap-6">
          <Form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            <AuthFormHeader title="Regístrate en Zentlet">
              ¿Ya tienes una cuenta? <AuthLink href="/auth/sign-in">Inicia sesión</AuthLink>
            </AuthFormHeader>
            <TextField>
              <Label htmlFor="name">Nombre</Label>
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
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                required
                {...register("confirmPassword")}
              />
            </TextField>
            <AuthSubmitButton>Registrarse</AuthSubmitButton>
            <SocialSignInButtons />
          </Form>
          <TermsNotice />
        </div>
      </div>
    </div>
  );
}
