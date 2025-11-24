"use client";

import { useEffect, useRef, useState } from 'react';
import Navbar from './components/navbar';

// Tambahkan import untuk Leaflet types
import type { Map } from 'leaflet';

interface Destination {
  id: number;
  title: string;
  location: string;
  coordinates: [number, number];
  province: string;
  category: string;
  description: string;
  image: string;
  source: string;
}

// Deklarasi global untuk Leaflet
declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

export default function Home() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);

  // Load data dari JSON
  useEffect(() => {
    const loadDestinations = async () => {
      try {
        const response = await fetch('/story_map_indonesia.json');
        const data = await response.json();
        setDestinations(data);
        if (data.length > 0) {
          setSelectedDestination(data[0]);
        }
      } catch (error) {
        console.error('Error loading destinations:', error);
        // Fallback data jika loading gagal
        const fallbackData = [
          {
            id: 1,
            title: "Proklamasi Kemerdekaan (Tugu Proklamasi)",
            location: "Jakarta",
            coordinates: [-6.1704, 106.8272] as [number, number],
            province: "DKI Jakarta",
            category: "Sejarah",
            description: "Lokasi peristiwa proklamasi dan monumen yang memperingati kemerdekaan Indonesia.",
            image: "/placeholder-history.jpg",
            source: "Sejarah nasional"
          }
        ];
        setDestinations(fallbackData);
        setSelectedDestination(fallbackData[0]);
      } finally {
        setLoading(false);
      }
    };

    loadDestinations();
  }, []);

  useEffect(() => {
    if (destinations.length === 0) return;

    const loadLeaflet = async () => {
      if (typeof window !== 'undefined' && mapRef.current && !mapInstance.current) {
        // Cek apakah Leaflet sudah dimuat
        if (window.L) {
          initializeMap();
          return;
        }

        // Load Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = initializeMap;
        document.head.appendChild(script);
      }
    };

    const initializeMap = () => {
      if (mapRef.current && window.L && destinations.length > 0) {
        const L = window.L;
        
        // Inisialisasi peta dengan view ke Indonesia
        mapInstance.current = L.map(mapRef.current).setView([-2.5489, 118.0149], 5);

        // Tambahkan tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(mapInstance.current);

        // Tambahkan custom icon berdasarkan kategori
        const getCategoryColor = (category: string) => {
          const colors: { [key: string]: string } = {
            'Sejarah': '#dc2626',
            'Alam': '#16a34a',
            'Budaya': '#9333ea',
            'Religi': '#ca8a04',
            'Modern': '#0369a1'
          };
          return colors[category] || '#6b7280';
        };

        // Tambahkan marker untuk setiap destinasi
        destinations.forEach((destination) => {
          const categoryColor = getCategoryColor(destination.category);
          
          const customIcon = L.divIcon({
            html: `
              <div style="
                background: ${categoryColor};
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                position: relative;
                cursor: pointer;
              ">
                <div style="
                  content: '';
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: 10px;
                  height: 10px;
                  background: white;
                  border-radius: 50%;
                "></div>
              </div>
            `,
            className: 'custom-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const marker = L.marker(destination.coordinates, {
            icon: customIcon
          }).addTo(mapInstance.current!);

          // Popup dengan informasi destinasi
          marker.bindPopup(`
            <div style="min-width: 250px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="background: ${categoryColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">${destination.category}</span>
                <span style="font-size: 11px; color: #6b7280;">${destination.province}</span>
              </div>
              <h3 style="margin: 0 0 8px 0; color: #1f2937; font-weight: bold; font-size: 16px;">${destination.title}</h3>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; line-height: 1.4;">${destination.description}</p>
              <div style="background: #f3f4f6; padding: 8px; border-radius: 4px; border-left: 3px solid ${categoryColor};">
                <p style="margin: 0; color: #4b5563; font-size: 12px; font-weight: 500;">📍 ${destination.location}</p>
                <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 11px;">Sumber: ${destination.source}</p>
              </div>
            </div>
          `);

          // Event click untuk menampilkan detail destinasi
          marker.on('click', () => {
            setSelectedDestination(destination);
          });
        });

        // Fit bounds untuk menampilkan semua marker
        const group = L.featureGroup(
          destinations.map(dest => L.marker(dest.coordinates))
        );
        mapInstance.current.fitBounds(group.getBounds().pad(0.1));
      }
    };

    loadLeaflet();

    // Cleanup
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [destinations]);

  const scrollToMap = () => {
    mapRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Sejarah': 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-200',
      'Alam': 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/20 dark:text-green-200',
      'Budaya': 'bg-purple-100 border-purple-500 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200',
      'Religi': 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
      'Modern': 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
    };
    return colors[category] || 'bg-gray-100 border-gray-500 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat peta dan data destinasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-blue-900 font-sans">
      <Navbar />

      {/* Hero Section */}
      <section id="hero" className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Peta<span className="text-red-600"> Sejarah</span> Indonesia
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Jelajahi situs-situs bersejarah dan budaya Indonesia melalui peta interaktif. 
            Klik pada marker untuk mengetahui cerita di balik setiap lokasi.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={scrollToMap}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Jelajahi Peta
            </button>
          </div>
        </div>
      </section>

      {/* Map Section dengan Detail Destinasi */}
      <section id="peta" className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Panel Detail Destinasi */}
              <div className="lg:col-span-1 bg-gray-50 dark:bg-gray-900 p-6 h-full">
                <div className="sticky top-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Detail Lokasi
                  </h2>
                  
                  {selectedDestination ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {selectedDestination.title}
                        </h3>
                        <span className={`${getCategoryColor(selectedDestination.category)} px-3 py-1 rounded-full text-xs font-medium border ml-2 flex-shrink-0`}>
                          {selectedDestination.category}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>📍 {selectedDestination.location}</span>
                        <span className="text-gray-300">•</span>
                        <span>{selectedDestination.province}</span>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedDestination.description}
                      </p>
                      
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong className="text-gray-900 dark:text-white">Sumber:</strong> {selectedDestination.source}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong className="text-gray-900 dark:text-white">Koordinat:</strong> {selectedDestination.coordinates[0].toFixed(4)}°, {selectedDestination.coordinates[1].toFixed(4)}°
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">🗺️</div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Klik pada marker di peta untuk melihat detail lokasi
                      </p>
                    </div>
                  )}

                  {/* Daftar Destinasi Singkat */}
                  <div className="mt-8">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Semua Lokasi ({destinations.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {destinations.map((destination) => (
                        <button
                          key={destination.id}
                          onClick={() => {
                            setSelectedDestination(destination);
                            if (mapInstance.current) {
                              mapInstance.current.setView(destination.coordinates, 12);
                            }
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedDestination?.id === destination.id
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                              {destination.title}
                            </span>
                            <span className={`${getCategoryColor(destination.category)} px-2 py-1 rounded text-xs`}>
                              {destination.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {destination.location}, {destination.province}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Peta */}
              <div className="lg:col-span-2">
                <div 
                  ref={mapRef}
                  id="map"
                  className="w-full h-96 lg:h-[600px]"
                  style={{ background: '#e5e7eb' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tentang Section */}
      <section id="tentang" className="py-16 px-4 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Tentang Peta Sejarah Indonesia
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Peta interaktif ini menampilkan berbagai situs bersejarah, budaya, dan penting di seluruh Indonesia. 
            Setiap marker mewakili lokasi dengan nilai sejarah dan budaya yang tinggi, dilengkapi dengan informasi 
            detail untuk membantu Anda memahami kekayaan warisan Indonesia.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-xl">🗺️</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Peta Interaktif</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Jelajahi lokasi dengan mudah melalui peta yang responsif
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-xl">📚</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Informasi Lengkap</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Detail sejarah dan budaya setiap lokasi tersedia
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 text-xl">🎯</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Navigasi Mudah</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Klik marker atau daftar untuk langsung menuju lokasi
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-white rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
                <h3 className="text-xl font-bold">Peta Bercerita</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Menjelajahi kekayaan sejarah dan budaya Indonesia melalui peta interaktif.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Kontak</h4>
              <div className="flex gap-4 text-gray-400">
                <a href="#" className="hover:text-white transition-colors">Email</a>
                <a href="#" className="hover:text-white transition-colors">Instagram</a>
                <a href="#" className="hover:text-white transition-colors">Twitter</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Peta Bercerita. Semua hak dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}