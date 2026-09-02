<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CategoryController extends Controller
{
    /**
     * Get a list of all active categories.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        $categories = Category::where('status', 1)
            ->whereNull('parent_id') // Get main categories
            ->orderBy('sort_order', 'asc')
            ->with('image') // Eager load image relationship
            ->get();

        $formattedCategories = $categories->map(function ($category) {
            $imageUrl = null;
            if ($category->image && $category->image->file_name) {
                // If it's already a full URL
                if (str_starts_with($category->image->file_name, 'http')) {
                    $imageUrl = $category->image->file_name;
                } else {
                    $imageUrl = asset('storage/' . $category->image->file_name);
                }
            } else {
                if ($category->slug === 'nutrition-powder') {
                    $imageUrl = asset('images/chocolate.jpeg');
                } elseif ($category->slug === 'dry-fruits-seeds') {
                    $imageUrl = asset('images/dryfruits.jpeg');
                } elseif ($category->slug === 'seeds-mix') {
                    $imageUrl = asset('images/rosted-seeds.jpeg');
                } else {
                    $imageUrl = asset('images/hero.jpeg');
                }
            }

            return [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'description' => $category->description,
                'image' => $imageUrl,
                'featured' => $category->featured,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $formattedCategories
        ]);
    }
}
