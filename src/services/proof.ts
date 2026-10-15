import api from "./api";

export type ProofOfDeliveryInput = {
  deliveryId: number;
  recipientName: string;
  notes?: string;
  photo?: {
    uri: string;
    name: string;
    type: string;
  } | null;
};

export async function submitProofOfDelivery(input: ProofOfDeliveryInput) {
  const formData = new FormData();

  formData.append("recipient_name", input.recipientName.trim());

  if (input.notes?.trim()) {
    formData.append("notes", input.notes.trim());
  }

  if (input.photo) {
    formData.append("photo", {
      uri: input.photo.uri,
      name: input.photo.name,
      type: input.photo.type,
    } as any);
  }

  const response = await api.post(
    `/driver/deliveries/${input.deliveryId}/proof`,
    formData,
    {
      headers: {
        "Content-Type": undefined,
      },
      transformRequest: (data) => data,
      timeout: 60000,
    },
  );

  return response.data;
}
