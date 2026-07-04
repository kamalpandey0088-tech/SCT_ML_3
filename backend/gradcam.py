import io
import base64
import numpy as np
import torch
import torch.nn as nn
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from PIL import Image

class GradCAMExtractor:
    def __init__(self, feature_extractor: nn.Module):
        self.feature_extractor = feature_extractor
        self.features = None
        self.hook = self.feature_extractor[0].register_forward_hook(self._hook_fn)

    def _hook_fn(self, module, input, output):
        self.features = output

    def generate(self) -> np.ndarray:
        if self.features is None:
            return np.zeros((7, 7), dtype=np.float32)
        # Convert output features map [1, 1280, 7, 7] into an activation heatmap.
        # We calculate the mean absolute activations along channels.
        activation_map = torch.abs(self.features[0]).mean(dim=0).cpu().detach().numpy()
        # ReLU logic (only look at positive activations, already positive due to abs)
        # Normalize between 0 and 1
        denom = activation_map.max() - activation_map.min()
        if denom > 1e-8:
            activation_map = (activation_map - activation_map.min()) / denom
        else:
            activation_map = np.zeros_like(activation_map)
        return activation_map

    def remove(self):
        self.hook.remove()

def create_gradcam_overlay(original_img: Image.Image, cam: np.ndarray) -> str:
    # Resize original image to 224x224
    orig_resized = original_img.resize((224, 224), Image.Resampling.LANCZOS)
    
    # Render colormapped heatmap
    cm = plt.get_cmap('inferno')
    heatmap_colored = cm(cam)[:, :, :3]  # Drop alpha channel
    heatmap_img = Image.fromarray((heatmap_colored * 255).astype(np.uint8))
    heatmap_img = heatmap_img.resize((224, 224), Image.Resampling.BILINEAR)

    # Blend original image and heatmap
    blended = Image.blend(orig_resized, heatmap_img, alpha=0.55)
    
    # Save to Base64 String
    buffer = io.BytesIO()
    blended.save(buffer, format="JPEG", quality=85)
    b64_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f"data:image/jpeg;base64,{b64_str}"
