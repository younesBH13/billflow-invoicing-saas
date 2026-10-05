import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, Invoice, CreateInvoiceRequest, handleApiError, transformFormToInvoice } from '../services/api';
import { buildInvoicePreview, buildPreviewFromForm } from '@/utils/invoicePreview';

// Hook for fetching invoices
export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: () => apiClient.getInvoices(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching a single invoice
export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => apiClient.getInvoiceById(id),
    enabled: !!id,
  });
};

// Hook for fetching clients
export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for creating invoices
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceRequest) => apiClient.createInvoice(data),
    onSuccess: (createdInvoice) => {
      queryClient.setQueryData<Invoice[]>(['invoices'], (current) => {
        if (!current) {
          return [createdInvoice];
        }

        const exists = current.some(invoice => invoice.id === createdInvoice.id);
        return exists ? current : [createdInvoice, ...current];
      });
    },
    onError: (error) => {
      console.error('Error creating invoice:', error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
};

// Hook for updating invoices
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateInvoiceRequest> }) =>
      apiClient.updateInvoice(id, data),
    onSuccess: (updatedInvoice) => {
      queryClient.setQueryData<Invoice[]>(['invoices'], (current) => {
        if (!current) {
          return [updatedInvoice];
        }

        return current.map(invoice =>
          invoice.id === updatedInvoice.id ? updatedInvoice : invoice
        );
      });

      queryClient.setQueryData(['invoice', updatedInvoice.id], updatedInvoice);
    },
    onError: (error) => {
      console.error('Error updating invoice:', error);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
      }
    }
  });
};

// Hook for deleting invoices
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteInvoice(id),
    onSuccess: (_response, id) => {
      queryClient.setQueryData<Invoice[]>(['invoices'], (current) => {
        if (!current) {
          return current;
        }

        return current.filter(invoice => invoice.id !== id);
      });
      queryClient.removeQueries({ queryKey: ['invoice', id] });
    },
    onError: (error) => {
      console.error('Error deleting invoice:', error);
    },
  });
};

// Hook for converting invoice types
export const useConvertInvoiceType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newType }: { id: string; newType: string }) =>
      apiClient.convertInvoiceType(id, newType),
    onSuccess: (updatedInvoice) => {
      queryClient.setQueryData<Invoice[]>(['invoices'], (current) => {
        if (!current) {
          return [updatedInvoice];
        }

        const exists = current.some(invoice => invoice.id === updatedInvoice.id);
        return exists
          ? current.map(invoice => (invoice.id === updatedInvoice.id ? updatedInvoice : invoice))
          : [updatedInvoice, ...current];
      });

      queryClient.setQueryData(['invoice', updatedInvoice.id], updatedInvoice);
    },
    onError: (error) => {
      console.error('Error converting invoice type:', error);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
      }
    }
  });
};

// Hook for getting next invoice number
export const useNextInvoiceNumber = (type: string) => {
  return useQuery({
    queryKey: ['nextInvoiceNumber', type],
    queryFn: () => apiClient.getNextInvoiceNumber(type),
    enabled: !!type,
  });
};

// Custom hook for invoice management with local state
export const useInvoiceManager = () => {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const { data: invoices, isLoading: invoicesLoading, error: invoicesError } = useInvoices();
  const { data: clients, isLoading: clientsLoading } = useClients();
  
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setIsFormOpen(true);
    setIsPreviewOpen(false);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
    setIsPreviewOpen(false);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(false);
    setIsPreviewOpen(true);
    // Transform invoice data for preview
    setPreviewData(buildInvoicePreview(invoice, { clients }));
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la facture ${invoice.number} ?`)) {
      try {
        await deleteMutation.mutateAsync(invoice.id);
      } catch (error) {
        alert(`Erreur lors de la suppression: ${handleApiError(error)}`);
      }
    }
  };

  const handleSubmitInvoice = async (formData: any) => {
    try {
      if (selectedInvoice) {
        await updateMutation.mutateAsync({
          id: selectedInvoice.id,
          data: transformFormToInvoiceRequest(formData)
        });
      } else {
        await createMutation.mutateAsync(transformFormToInvoiceRequest(formData));
      }
      setIsFormOpen(false);
      setSelectedInvoice(null);
    } catch (error) {
      alert(`Erreur lors de l'enregistrement: ${handleApiError(error)}`);
    }
  };

  const handlePreviewFromForm = (formData: any) => {
    setPreviewData(buildPreviewFromForm(formData));
    setIsFormOpen(false);
    setIsPreviewOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedInvoice(null);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewData(null);
  };

  const goBackToForm = () => {
    setIsPreviewOpen(false);
    setIsFormOpen(true);
  };

  return {
    // Data
    invoices: invoices || [],
    clients: clients || [],
    selectedInvoice,
    previewData,
    
    // Loading states
    isLoading: invoicesLoading || clientsLoading,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // UI states
    isFormOpen,
    isPreviewOpen,
    
    // Actions
    handleCreateInvoice,
    handleEditInvoice,
    handleViewInvoice,
    handleDeleteInvoice,
    handleSubmitInvoice,
    handlePreviewFromForm,
    closeForm,
    closePreview,
    goBackToForm,
    
    // Errors
    error: invoicesError,
  };
};

const transformFormToInvoiceRequest = (formData: any): CreateInvoiceRequest =>
  transformFormToInvoice(formData);

export default useInvoiceManager;

