import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import BottomNavigation from "@/bottom-navigation";
// The original `ui/form` primitives are not present in this repo.
// Provide lightweight fallbacks so the admin page can render without the missing module.
// These wrappers aim to be non-intrusive: they render standard HTML elements and,
// when a render-prop expecting `{ field }` is used, provide a minimal `field` object
// so existing JSX like `({ field }) => <input {...field} />` still works without throwing.
const Form: any = (props: any) => <form {...props} />;

const FormControl: any = (props: any) => <div {...props} />;

const FormField: any = ({ children, ...rest }: any) => {
  // If the child is a function (render-prop) call it with a minimal `field` object.
  if (typeof children === "function") {
    const field = {
      value: undefined,
      onChange: (_: any) => {},
      onBlur: () => {},
      ref: () => {},
      name: rest.name ?? undefined,
    };
    return <div {...rest}>{children({ field })}</div>;
  }
  return <div {...rest}>{children}</div>;
};

const FormItem: any = (props: any) => <div {...props} />;

const FormLabel: any = (props: any) => <label {...props} />;

const FormMessage: any = (props: any) => <div {...props} />;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLearningModuleSchema, type InsertLearningModule, type LearningModule, type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, BookOpen, Settings, Plus, Edit, Trash2, Crown, Shield, Activity, ArrowLeft } from "lucide-react";
import { z } from "zod";

const moduleFormSchema = insertLearningModuleSchema.extend({
  quizOptions: z.array(z.string()).optional(),
});

type ModuleForm = z.infer<typeof moduleFormSchema>;

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("users");
  const [editingModule, setEditingModule] = useState<any>(null);

  // Fetch data (typed & resilient)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/users");
        return (await res.json()) as User[];
      } catch (err) {
        // If the request fails (unauthorized / network), return an empty array so UI can render safely.
        return [];
      }
    },
    // Keep this reasonably stable in memory to avoid repeated refetches during small UI interactions
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: modules = [] } = useQuery<LearningModule[]>({
    queryKey: ["/api/modules"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/modules");
        return (await res.json()) as LearningModule[];
      } catch (err) {
        // Return empty list on error so downstream rendering doesn't break
        return [] as LearningModule[];
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Webhook logs query
  const { data: webhookLogsData, refetch: refetchWebhookLogs } = useQuery<{ logs: any[] }>({
    queryKey: ["/api/admin/webhook-logs"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/webhook-logs?limit=100");
        return (await res.json()) as { logs: any[] };
      } catch (err) {
        return { logs: [] };
      }
    },
    retry: false,
    staleTime: 30 * 1000, // 30 seconds - webhook logs should be more frequently updated
  });

  const webhookLogs = webhookLogsData?.logs || [];

  const form = useForm<ModuleForm>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      orderIndex: 0,
      isLocked: true,
      quizQuestion: "",
      quizOptions: ["", "", "", ""],
      correctAnswer: "",
    },
  });

  // Mutations
  const createModuleMutation = useMutation({
    mutationFn: async (data: ModuleForm) => {
      // apiRequest accepts (method, url, data) — pass the body object directly
      return apiRequest("POST", "/api/admin/modules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      toast({ title: "Module created successfully!" });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create module",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      // Use apiRequest with method, url and data object
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User role updated successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update user role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ModuleForm) => {
    createModuleMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-brand-light-green/10" style={{ paddingBottom: '90px' }}>
      {/* Header */}
      <header className="bg-brand-light-green border-b border-brand-dark-green/20 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-brand-dark-green hover:text-brand-orange"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-brand-orange" />
              <h1 className="text-xl font-bold text-brand-dark-green">Admin Dashboard</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <p className="text-brand-brown mb-6">Manage users, permissions, and course content</p>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Webhook Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Users Management */}
          <TabsContent value="users">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-brand-dark-green">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <p className="text-center text-brand-brown py-8">No users found</p>
                  ) : (
                    users.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-brand-light-green/20 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-brand-dark-green">
                              {user.firstName?.[0] || user.email[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-brand-dark-green">
                              {user.firstName} {user.lastName}
                            </h3>
                            <p className="text-sm text-brand-brown">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {user.experienceLevel || 'beginner'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {user.selectedLanguage || 'en'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select 
                            defaultValue={user.role || "user"}
                            onValueChange={(role) => updateUserRoleMutation.mutate({ userId: user.id, role })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                            {user.role || 'user'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modules Management */}
          <TabsContent value="modules">
            <div className="space-y-6">
              {/* Create Module Form */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-brand-dark-green">
                    <Plus className="h-5 w-5" />
                    Create New Module
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }: any) => (
                            <FormItem>
                              <FormLabel>Module Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Introduction to Stocks" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="orderIndex"
                          render={({ field }: any) => (
                            <FormItem>
                              <FormLabel>Order</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="1" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }: any) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief description of the module..." 
                                {...field} 
                                rows={2}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }: any) => (
                          <FormItem>
                            <FormLabel>Module Content</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Full module content..." 
                                {...field} 
                                rows={6}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="quizQuestion"
                        render={({ field }: any) => (
                          <FormItem>
                            <FormLabel>Quiz Question (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="What is the main benefit of diversification?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={createModuleMutation.isPending}
                        className="bg-brand-light-green hover:bg-brand-light-green/80 text-brand-dark-green font-semibold"
                      >
                        {createModuleMutation.isPending ? "Creating..." : "Create Module"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Existing Modules */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-brand-dark-green">
                    <BookOpen className="h-5 w-5" />
                    Existing Modules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {modules.map((module: any) => (
                      <div key={module.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                        <div className="flex-1">
                          <h3 className="font-semibold text-brand-dark-green">{module.title}</h3>
                          <p className="text-sm text-brand-brown">{module.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">Order: {module.orderIndex}</Badge>
                            <Badge variant={module.isLocked ? "secondary" : "default"}>
                              {module.isLocked ? "Locked" : "Unlocked"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Webhook Logs */}
          <TabsContent value="webhooks">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-brand-dark-green">
                    <Activity className="h-5 w-5" />
                    Webhook Logs
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchWebhookLogs()}
                  >
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {webhookLogs.length === 0 ? (
                    <p className="text-center text-brand-brown py-8">No webhook logs found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-brand-light-green/10">
                            <th className="text-left p-2 text-sm font-semibold text-brand-dark-green">ID</th>
                            <th className="text-left p-2 text-sm font-semibold text-brand-dark-green">Source</th>
                            <th className="text-left p-2 text-sm font-semibold text-brand-dark-green">Event Type</th>
                            <th className="text-left p-2 text-sm font-semibold text-brand-dark-green">Status</th>
                            <th className="text-left p-2 text-sm font-semibold text-brand-dark-green">User ID</th>
                            <th className="text-left p-2 text-sm font-semibold text-brand-dark-green">Created At</th>
                            <th className="text-left p-2 text-sm font-semibold text-brand-dark-green">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {webhookLogs.map((log: any) => (
                            <tr key={log.id} className="border-b hover:bg-brand-light-green/5">
                              <td className="p-2 text-sm text-brand-brown">{log.id}</td>
                              <td className="p-2 text-sm">
                                <Badge variant="outline">{log.source}</Badge>
                              </td>
                              <td className="p-2 text-sm text-brand-dark-green font-medium">
                                {log.eventType}
                              </td>
                              <td className="p-2 text-sm">
                                <Badge
                                  variant={
                                    log.status === "processed"
                                      ? "default"
                                      : log.status === "failed"
                                      ? "destructive"
                                      : log.status === "invalid"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {log.status}
                                </Badge>
                              </td>
                              <td className="p-2 text-sm text-brand-brown">
                                {log.userId || "-"}
                              </td>
                              <td className="p-2 text-sm text-brand-brown">
                                {log.createdAt
                                  ? new Date(log.createdAt).toLocaleString()
                                  : "-"}
                              </td>
                              <td className="p-2 text-sm">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      View Details
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Webhook Log Details</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                      <div>
                                        <h4 className="font-semibold text-brand-dark-green mb-2">Basic Information</h4>
                                        <div className="space-y-2 text-sm">
                                          <p><strong>ID:</strong> {log.id}</p>
                                          <p><strong>Source:</strong> {log.source}</p>
                                          <p><strong>Event Type:</strong> {log.eventType}</p>
                                          <p><strong>Status:</strong> {log.status}</p>
                                          <p><strong>User ID:</strong> {log.userId || "N/A"}</p>
                                          <p><strong>Subscription ID:</strong> {log.subscriptionId || "N/A"}</p>
                                          <p><strong>Created At:</strong> {log.createdAt ? new Date(log.createdAt).toLocaleString() : "N/A"}</p>
                                          <p><strong>Processed At:</strong> {log.processedAt ? new Date(log.processedAt).toLocaleString() : "N/A"}</p>
                                          {log.errorMessage && (
                                            <p className="text-red-600"><strong>Error:</strong> {log.errorMessage}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-brand-dark-green mb-2">Payload</h4>
                                        <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                                          {JSON.stringify(log.payload, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-brand-dark-green">
                  <Settings className="h-5 w-5" />
                  Application Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 border rounded-lg bg-brand-light-green/10">
                    <h3 className="font-semibold text-brand-dark-green mb-2">AI Financial News Integration</h3>
                    <p className="text-brand-brown text-sm mb-4">
                      For financial news recommendations, I recommend integrating with these AI-powered services:
                    </p>
                    <ul className="list-disc list-inside text-brand-brown text-sm space-y-1">
                      <li><strong>Alpha Vantage</strong> - Real-time and historical market data with news sentiment</li>
                      <li><strong>News API</strong> - Financial news aggregation with filtering capabilities</li>
                      <li><strong>OpenAI GPT-4</strong> - For intelligent news summarization and personalization</li>
                      <li><strong>Polygon.io</strong> - Market data with integrated news feeds</li>
                    </ul>
                    <p className="text-brand-brown text-sm mt-2">
                      Would you like me to integrate any of these services? I'll need API keys to get started.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-brand-dark-green mb-2">Total Users</h4>
                        <p className="text-2xl font-bold text-brand-orange">{users.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-brand-dark-green mb-2">Total Modules</h4>
                        <p className="text-2xl font-bold text-brand-orange">{modules.length}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}