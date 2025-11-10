import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLearningModuleSchema, type InsertLearningModule } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, BookOpen, Settings, Plus, Edit, Trash2, Crown, Shield } from "lucide-react";
import { z } from "zod";

const moduleFormSchema = insertLearningModuleSchema.extend({
  quizOptions: z.array(z.string()).optional(),
});

type ModuleForm = z.infer<typeof moduleFormSchema>;

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("users");
  const [editingModule, setEditingModule] = useState<any>(null);

  // Fetch data
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["/api/modules"],
  });

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
      return apiRequest("/api/admin/modules", {
        method: "POST",
        body: JSON.stringify(data),
      });
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
      return apiRequest(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
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
    <div className="min-h-screen bg-gradient-to-br from-brand-light-green/10 to-brand-blue/10 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-8 w-8 text-brand-orange" />
            <h1 className="text-3xl font-bold text-brand-dark-green">Admin Dashboard</h1>
          </div>
          <p className="text-brand-brown">Manage users, permissions, and course content</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Modules
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
                          render={({ field }) => (
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
                          render={({ field }) => (
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
                        render={({ field }) => (
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
                        render={({ field }) => (
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
                        render={({ field }) => (
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
  );
}