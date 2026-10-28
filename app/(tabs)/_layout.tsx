import { Tabs } from 'expo-router';
import { Library, Pencil, Map, Play } from 'lucide-react-native';
import { Colors } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary[600],
        tabBarInactiveTintColor: Colors.neutral[400],
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 11,
        },
        tabBarStyle: {
          backgroundColor: Colors.neutral[0],
          borderTopColor: Colors.neutral[100],
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pustaka',
          tabBarIcon: ({ size, color }) => <Library size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="editor"
        options={{
          title: 'Editor',
          tabBarIcon: ({ size, color }) => <Pencil size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Peta',
          tabBarIcon: ({ size, color }) => <Map size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: 'Main',
          tabBarIcon: ({ size, color }) => <Play size={size} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
