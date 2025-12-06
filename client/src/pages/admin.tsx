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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLearningModuleSchema, type InsertLearningModule, type LearningModule, type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, BookOpen, Settings, Plus, Edit, Trash2, Crown, Shield, Activity, ArrowLeft } from "lucide-react";
import { z } from "zod";

const videoFormSchema = z.object({
  videoUrl: z.string().url("Debe ser una URL válida de YouTube"),
  title: z.string().min(1, "El título es requerido"),
  titleEs: z.string().optional(),
  description: z.string().optional(),
  descriptionEs: z.string().optional(),
  videoOrder: z.number().min(1, "El orden debe ser mayor a 0"),
});

const moduleFormSchema = insertLearningModuleSchema.extend({
  videos: z.array(videoFormSchema).optional().default([]),
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

  const { data: modules = [] } = useQuery<(LearningModule & { videos?: any[] })[]>({
    queryKey: ["/api/modules"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/modules");
        const data = await res.json();
        return data as (LearningModule & { videos?: any[] })[];
      } catch (err) {
        // Return empty list on error so downstream rendering doesn't break
        return [] as (LearningModule & { videos?: any[] })[];
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

  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [videoFormData, setVideoFormData] = useState({
    videoUrl: "",
    title: "",
    titleEs: "",
    description: "",
    descriptionEs: "",
    videoOrder: 1,
  });

  const form = useForm<ModuleForm>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: "",
      description: "",
      orderIndex: 1,
      isPremium: false,
      videos: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "videos",
  });

  // Mutations
  const createModuleMutation = useMutation({
    mutationFn: async (data: ModuleForm) => {
      const res = await apiRequest("POST", "/api/admin/modules", data);
      return await res.json();
    },
    onSuccess: async (module: any) => {
      // Invalidate and refetch modules to get the full data with videos
      await queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      await queryClient.refetchQueries({ queryKey: ["/api/modules"] });
      toast({ title: "Módulo creado exitosamente!" });
      form.reset({
        title: "",
        description: "",
        orderIndex: 1,
        isPremium: false,
        videos: [],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear módulo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Video mutations
  const createVideoMutation = useMutation({
    mutationFn: async ({ moduleId, data }: { moduleId: number; data: any }) => {
      const res = await apiRequest("POST", `/api/admin/modules/${moduleId}/videos`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      toast({ title: "Video agregado exitosamente!" });
      setVideoFormData({
        videoUrl: "",
        title: "",
        titleEs: "",
        description: "",
        descriptionEs: "",
        videoOrder: 1,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al agregar video",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      return apiRequest("DELETE", `/api/admin/videos/${videoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      toast({ title: "Video eliminado exitosamente!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar video",
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

  const onError = (errors: any) => {
    console.log("🚀 ~ onError ~ errors:", errors);
    toast({
      title: "Validation Error",
      description: "Please check the form fields and try again.",
      variant: "destructive",
    });
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
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        console.log("🔵 Form submit event triggered");
                        form.handleSubmit(onSubmit, onError)(e);
                      }} 
                      className="space-y-4"
                    >
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
                        name="isPremium"
                        render={({ field }: any) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value || false}
                                onChange={(e) => field.onChange(e.target.checked)}
                                className="w-4 h-4"
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Contenido Premium</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Videos Section */}
                      <div className="border-t pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-brand-dark-green">Videos del Módulo</h3>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({
                              videoUrl: "",
                              title: "",
                              titleEs: "",
                              description: "",
                              descriptionEs: "",
                              videoOrder: fields.length + 1,
                            })}
                            className="text-brand-orange border-brand-orange"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar Video
                          </Button>
                        </div>

                        {fields.length === 0 && (
                          <p className="text-sm text-brand-brown text-center py-4 bg-gray-50 rounded-lg">
                            No hay videos agregados. Haz clic en "Agregar Video" para agregar uno.
                          </p>
                        )}

                        <div className="space-y-4">
                          {fields.map((field, index) => (
                            <div key={field.id} className="bg-gray-50 p-4 rounded-lg border space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-brand-dark-green">
                                  Video {index + 1}
                                </h4>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => remove(index)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <FormField
                                  control={form.control}
                                  name={`videos.${index}.videoUrl`}
                                  render={({ field }: any) => (
                                    <FormItem>
                                      <FormLabel>URL de YouTube *</FormLabel>
                                      <FormControl>
                                        <Input placeholder="https://www.youtube.com/watch?v=..." {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`videos.${index}.title`}
                                  render={({ field }: any) => (
                                    <FormItem>
                                      <FormLabel>Título *</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Título del video" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`videos.${index}.titleEs`}
                                  render={({ field }: any) => (
                                    <FormItem>
                                      <FormLabel>Título (Español)</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Título en español (opcional)" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`videos.${index}.videoOrder`}
                                  render={({ field }: any) => (
                                    <FormItem>
                                      <FormLabel>Orden</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="1"
                                          {...field}
                                          onChange={(e) => field.onChange(parseInt(e.target.value) || index + 1)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name={`videos.${index}.description`}
                                render={({ field }: any) => (
                                  <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Descripción del video (opcional)"
                                        {...field}
                                        rows={2}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={createModuleMutation.isPending}
                        className="bg-brand-light-green hover:bg-brand-light-green/80 text-brand-dark-green font-semibold w-full"
                      >
                        {createModuleMutation.isPending ? "Creando..." : "Crear Módulo y Videos"}
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
                    Módulos Existentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {modules.map((module: any) => {
                      const isExpanded = editingModuleId === module.id;
                      const moduleVideos = module.videos || [];
                      
                      return (
                        <div key={module.id} className="border rounded-lg bg-white">
                          <div className="flex items-center justify-between p-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-brand-dark-green">{module.title}</h3>
                              <p className="text-sm text-brand-brown">{module.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">Orden: {module.orderIndex}</Badge>
                                {module.isPremium && (
                                  <Badge variant="outline" className="text-orange-600">
                                    <Crown className="h-3 w-3 mr-1" />
                                    Premium
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-blue-600">
                                  🎥 {moduleVideos.length} {moduleVideos.length === 1 ? 'video' : 'videos'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setEditingModuleId(isExpanded ? null : module.id)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                {isExpanded ? "Cerrar" : "Gestionar Videos"}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Video Management Section */}
                          {isExpanded && (
                            <div className="border-t p-4 space-y-4 bg-gray-50">
                              <h4 className="font-semibold text-brand-dark-green mb-3">
                                Videos del Módulo
                              </h4>
                              
                              {/* Add Video Form */}
                              <div className="bg-white p-4 rounded-lg border space-y-3">
                                <h5 className="font-medium text-brand-dark-green">Agregar Nuevo Video</h5>
                                <div className="grid grid-cols-2 gap-3">
                                  <Input
                                    placeholder="URL de YouTube"
                                    value={videoFormData.videoUrl}
                                    onChange={(e) => setVideoFormData({ ...videoFormData, videoUrl: e.target.value })}
                                  />
                                  <Input
                                    placeholder="Título del video"
                                    value={videoFormData.title}
                                    onChange={(e) => setVideoFormData({ ...videoFormData, title: e.target.value })}
                                  />
                                  <Input
                                    placeholder="Título (Español) - Opcional"
                                    value={videoFormData.titleEs}
                                    onChange={(e) => setVideoFormData({ ...videoFormData, titleEs: e.target.value })}
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Orden (1, 2, 3...)"
                                    value={videoFormData.videoOrder}
                                    onChange={(e) => setVideoFormData({ ...videoFormData, videoOrder: parseInt(e.target.value) || 1 })}
                                  />
                                </div>
                                <Textarea
                                  placeholder="Descripción (opcional)"
                                  value={videoFormData.description}
                                  onChange={(e) => setVideoFormData({ ...videoFormData, description: e.target.value })}
                                  rows={2}
                                />
                                <Button
                                  onClick={() => {
                                    if (!videoFormData.videoUrl || !videoFormData.title) {
                                      toast({
                                        title: "Error",
                                        description: "URL y título son requeridos",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    createVideoMutation.mutate({ moduleId: module.id, data: videoFormData });
                                  }}
                                  disabled={createVideoMutation.isPending}
                                  className="bg-brand-orange hover:bg-orange-600 text-white"
                                >
                                  {createVideoMutation.isPending ? "Agregando..." : "Agregar Video"}
                                </Button>
                              </div>
                              
                              {/* Videos List */}
                              <div className="space-y-2">
                                {moduleVideos.length === 0 ? (
                                  <p className="text-sm text-brand-brown text-center py-4">
                                    No hay videos en este módulo. Agrega el primero arriba.
                                  </p>
                                ) : (
                                  moduleVideos
                                    .sort((a: any, b: any) => a.videoOrder - b.videoOrder)
                                    .map((video: any) => (
                                      <div key={video.id} className="bg-white p-3 rounded-lg border flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline">#{video.videoOrder}</Badge>
                                            <h5 className="font-medium text-brand-dark-green">{video.title}</h5>
                                          </div>
                                          {video.description && (
                                            <p className="text-sm text-brand-brown mt-1">{video.description}</p>
                                          )}
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-red-600"
                                          onClick={() => {
                                            if (confirm("¿Estás seguro de eliminar este video?")) {
                                              deleteVideoMutation.mutate(video.id);
                                            }
                                          }}
                                          disabled={deleteVideoMutation.isPending}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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