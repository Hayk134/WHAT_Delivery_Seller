import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/providers/auth-provider";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "Укажите имя"),
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
  organizationName: z.string().min(2, "Укажите бренд организации"),
  organizationLegalName: z.string().min(2, "Укажите юридическое название"),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState<"login" | "register" | null>(null);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      organizationName: "",
      organizationLegalName: "",
    },
  });

  const highlights = useMemo(
    () => [
      "Живая доска заказов с обновлением статусов в реальном времени",
      "Управление филиалами, номенклатурой и приходом товаров",
      "Светлый интерфейс для бэк-офиса без лишнего шума",
    ],
    [],
  );

  const handleLogin = loginForm.handleSubmit(async (values) => {
    try {
      setLoading("login");
      await login(values);
      toast.success("Вход выполнен");
      navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось выполнить вход";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  });

  const handleRegister = registerForm.handleSubmit(async (values) => {
    try {
      setLoading("register");
      await register({
        ...values,
        role: "MERCHANT_ADMIN",
      });
      toast.success("Организация зарегистрирована");
      navigate("/", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось зарегистрировать организацию";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  });

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-soft-grid opacity-40 [background-size:40px_40px]" />
      <div className="mx-auto grid min-h-screen max-w-[1440px] gap-10 px-4 py-6 md:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center xl:px-12">
        <section className="relative overflow-hidden rounded-[40px] border border-white/70 bg-stone-950 px-8 py-12 text-white shadow-panel">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,215,0,0.18),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(255,249,196,0.16),transparent_20%)]" />
          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/85">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              Merchant Portal для агрегатора доставки
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
              Единый кабинет торговой компании для сети филиалов и заказов доставки
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/72">
              SellerCabinet связывает операционную команду, склад и поток заказов в одной
              панели, завязанной на реальный backend API.
            </p>

            <div className="mt-10 grid gap-4">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-4"
                >
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-yellow-300" />
                  <p className="text-sm leading-6 text-white/82">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-white/8 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/50">Стек</p>
                <p className="mt-2 text-lg font-semibold">React + shadcn/ui</p>
              </div>
              <div className="rounded-3xl bg-white/8 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/50">Режим</p>
                <p className="mt-2 text-lg font-semibold">Realtime orders</p>
              </div>
              <div className="rounded-3xl bg-white/8 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/50">API</p>
                <p className="mt-2 text-lg font-semibold">Merchant endpoints</p>
              </div>
            </div>
          </div>
        </section>

        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-primary/25 blur-3xl" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Вход в SellerCabinet</CardTitle>
                <CardDescription>
                  Войдите под merchant-аккаунтом или зарегистрируйте новую торговую
                  компанию.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    placeholder="owner@company.ru"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Пароль</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleLogin}
                  disabled={loading !== null}
                >
                  {loading === "login" ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Входим...
                    </>
                  ) : (
                    "Войти в кабинет"
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Ваше имя</Label>
                    <Input
                      id="register-name"
                      placeholder="Иван Петров"
                      {...registerForm.register("fullName")}
                    />
                    {registerForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      placeholder="owner@company.ru"
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Пароль</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-brand">Название бренда</Label>
                  <Input
                    id="register-brand"
                    placeholder='Например: "Золотая Корзина"'
                    {...registerForm.register("organizationName")}
                  />
                  {registerForm.formState.errors.organizationName && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.organizationName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-legal">Юридическое название</Label>
                  <Input
                    id="register-legal"
                    placeholder="ООО Золотая Корзина"
                    {...registerForm.register("organizationLegalName")}
                  />
                  {registerForm.formState.errors.organizationLegalName && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.organizationLegalName.message}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleRegister}
                  disabled={loading !== null}
                >
                  {loading === "register" ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Создаем кабинет...
                    </>
                  ) : (
                    "Зарегистрировать организацию"
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
