import {
  useGetMe,
  useUpdateMe,
  useListUsers,
  useUpdateUserRole,
  useAdminCreateUser,
  getGetMeQueryKey,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useClerk } from "@clerk/react";
import { LogOut, Loader2, User, Shield, Users, UserPlus, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const settingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
});
type SettingsValues = z.infer<typeof settingsSchema>;

const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "member"]),
});
type CreateUserValues = z.infer<typeof createUserSchema>;

export function SettingsPage() {
  const { toast } = useToast();
  const { signOut } = useClerk();
  const { data: me, isLoading } = useGetMe();
  const { data: allUsers, isLoading: loadingUsers } = useListUsers();
  const updateMe = useUpdateMe();
  const updateRole = useUpdateUserRole();
  const adminCreateUser = useAdminCreateUser();

  const isAdmin = me?.role === "admin";

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdUserInfo, setCreatedUserInfo] = useState<{ name: string; email: string; password: string } | null>(null);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { name: "" },
  });

  const createUserForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", role: "member" },
  });

  useEffect(() => {
    if (me) form.reset({ name: me.name });
  }, [me, form]);

  function onSubmit(data: SettingsValues) {
    updateMe.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "Profile updated" });
        },
        onError: () => {
          toast({ title: "Error", description: "Could not update profile.", variant: "destructive" });
        },
      }
    );
  }

  function handleRoleChange(userId: number, role: "admin" | "member") {
    updateRole.mutate(
      { id: userId, data: { role } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "Role updated", description: `User is now ${role === "admin" ? "an Admin" : "a Member"}.` });
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? "Could not update role.";
          toast({ title: "Error", description: msg, variant: "destructive" });
        },
      }
    );
  }

  function onCreateUser(data: CreateUserValues) {
    adminCreateUser.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setCreatedUserInfo({
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            password: data.password,
          });
          createUserForm.reset();
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? "Could not create user.";
          toast({ title: "Error creating user", description: msg, variant: "destructive" });
        },
      }
    );
  }

  function closeCreateDialog() {
    setCreateUserOpen(false);
    setCreatedUserInfo(null);
    setShowPassword(false);
    createUserForm.reset();
  }

  const otherUsers = allUsers?.filter((u) => u.id !== me?.id) ?? [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" /> Profile
          </CardTitle>
          <CardDescription>Update your display name</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={me?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xl font-bold">
                    {me?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{me?.name}</p>
                  <p className="text-sm text-slate-500">{me?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={me?.role === "admin" ? "default" : "secondary"} className="capitalize">
                      <Shield className="w-3 h-3 mr-1" />
                      {me?.role === "admin" ? "Administrator" : "Member"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Your name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <Input value={me?.email || ""} disabled className="bg-slate-50 dark:bg-slate-800" />
                    <p className="text-xs text-slate-500">Email is managed through your auth provider.</p>
                  </div>
                  <Button type="submit" disabled={updateMe.isPending}>
                    {updateMe.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management — Admin only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" /> User Management
                </CardTitle>
                <CardDescription className="mt-1">
                  Create new users and change their roles. The first user to sign up is automatically Admin.
                </CardDescription>
              </div>
              <Button onClick={() => setCreateUserOpen(true)} size="sm" className="shrink-0">
                <UserPlus className="w-4 h-4 mr-2" /> Create User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : otherUsers.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl">
                <Users className="mx-auto w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No other users yet.</p>
                <p className="text-xs text-slate-400 mt-1">Click "Create User" to add your first team member.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {otherUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/60 dark:bg-slate-900/60"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-semibold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs capitalize hidden sm:flex">
                        <Shield className="w-3 h-3 mr-1" />{user.role}
                      </Badge>
                      <Select
                        value={user.role}
                        onValueChange={(v) => handleRoleChange(user.id, v as "admin" | "member")}
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">
                            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Member</span>
                          </SelectItem>
                          <SelectItem value="admin">
                            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Admin</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <p className="font-semibold">Role permissions</p>
                  <p><span className="font-medium">Admin</span> — can create users, manage roles, and access all data.</p>
                  <p><span className="font-medium">Member</span> — can create projects, manage tasks, and collaborate on assigned projects.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sign Out */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
            <LogOut className="w-5 h-5" /> Sign Out
          </CardTitle>
          <CardDescription>Sign out of your account on this device</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={(open) => { if (!open) closeCreateDialog(); else setCreateUserOpen(true); }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Create New User
            </DialogTitle>
            <DialogDescription>
              Fill in the details below. The credentials will be shown once so you can share them with the user.
            </DialogDescription>
          </DialogHeader>

          {createdUserInfo ? (
            /* Success screen */
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">User created successfully!</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{createdUserInfo.name} can now log in.</p>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border text-sm">
                <p className="font-semibold text-slate-700 dark:text-slate-200">Share these credentials with the user:</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Email</span>
                    <span className="font-mono font-medium">{createdUserInfo.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Password</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">
                        {showPassword ? createdUserInfo.password : "••••••••"}
                      </span>
                      <button onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-700">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center">
                This password is shown only once. Ask the user to change it after first login.
              </p>

              <DialogFooter>
                <Button onClick={closeCreateDialog} className="w-full">Done</Button>
              </DialogFooter>
            </div>
          ) : (
            /* Create form */
            <Form {...createUserForm}>
              <form onSubmit={createUserForm.handleSubmit(onCreateUser)} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={createUserForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createUserForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporary Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Min 8 characters"
                            {...field}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createUserForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="member">
                            <span className="flex items-center gap-2"><User className="w-4 h-4" /> Member</span>
                          </SelectItem>
                          <SelectItem value="admin">
                            <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Admin</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-2">
                  <Button variant="outline" type="button" onClick={closeCreateDialog}>Cancel</Button>
                  <Button type="submit" disabled={adminCreateUser.isPending}>
                    {adminCreateUser.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                      : <><UserPlus className="w-4 h-4 mr-2" /> Create User</>
                    }
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
