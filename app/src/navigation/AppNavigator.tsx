import React, { useCallback, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles } from 'react-native-unistyles';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setUnreadReceived } from '../store/appSlice';
import { loadUnreadReceivedCount } from '../utils/supabase';
import { useReceivedComplimentsRealtime } from '../utils/realtimeHooks';

import OnboardingScreen from '../screens/OnboardingScreen';
import LandingScreen from '../screens/LandingScreen';
import BriefScreen from '../screens/BriefScreen';
import WriteScreen from '../screens/WriteScreen';
import BloomScreen from '../screens/BloomScreen';
import ComplimentViewScreen from '../screens/ComplimentViewScreen';
import RecapScreen from '../screens/RecapScreen';
import GroupsScreen from '../screens/GroupsScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import GroupSettingsScreen from '../screens/GroupSettingsScreen';
import TeamsListScreen from '../screens/TeamsListScreen';
import CreateTeamScreen from '../screens/CreateTeamScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import TeamSettingsScreen from '../screens/TeamSettingsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import GeoLeaderboardScreen from '../screens/GeoLeaderboardScreen';
import LinkEmailScreen from '../screens/LinkEmailScreen';
import ProScreen from '../screens/ProScreen';
import ChoosePlanScreen from '../screens/ChoosePlanScreen';
import { HomeIcon, RecapIcon, GroupsIcon, BuildingIcon, SettingsIcon } from '../components/icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Brief" component={BriefScreen} />
      <Stack.Screen name="Write" component={WriteScreen} />
      <Stack.Screen name="Bloom" component={BloomScreen} />
      {/* `Compliment` (the /c/:id target) is now registered at the ROOT
          navigator (see AppNavigator below) so it resolves before onboarding
          too — not here. */}
      {/* Done screen intentionally removed (2026-05-14). After a submit
          the Bloom animation pops back to Landing, where the
          SEND IT TO X card lives. Keeping Done registered would let a
          stale navigation state still render its "Back to home" /
          Pro upsell / Teams card on top of the Home tab — exactly
          the contradiction the client flagged. */}
      <Stack.Screen name="Pro" component={ProScreen} />
      {/*
        Also registered inside SettingsStack — React Navigation scopes route
        names per navigator so duplication is fine. Registering here lets the
        setup-modal's OTP hand-off open the verify sheet over Write without
        yanking the user across to the Settings tab.
      */}
      <Stack.Screen
        name="LinkEmail"
        component={LinkEmailScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

function GroupsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupsList" component={GroupsScreen} />
      <Stack.Screen name="ChoosePlan" component={ChoosePlanScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsList" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="LinkEmail" component={LinkEmailScreen} />
      <Stack.Screen name="GeoLeaderboard" component={GeoLeaderboardScreen} />
    </Stack.Navigator>
  );
}

function TeamsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeamsList" component={TeamsListScreen} />
      <Stack.Screen name="CreateTeam" component={CreateTeamScreen} />
      <Stack.Screen name="ChoosePlan" component={ChoosePlanScreen} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
      <Stack.Screen name="TeamSettings" component={TeamSettingsScreen} />
    </Stack.Navigator>
  );
}

function TabIcon({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 56, minHeight: 48, gap: 3 }}>
      {icon}
      <Text style={{ fontSize: 9, color, fontWeight: '600', letterSpacing: 0.2 }}>{label}</Text>
    </View>
  );
}

function MainTabs() {
  const { theme } = useStyles();
  const dispatch = useDispatch();
  // Red dot on the Recap tab when the user has unseen received compliments.
  const unreadReceived = useSelector((s: RootState) => s.app.unreadReceived);
  const username = useSelector((s: RootState) => s.app.username);

  // Light the dot the moment a compliment arrives. App.tsx only refreshes
  // the count on launch/foreground, so while the user sat on Home an
  // arriving compliment left the dot dark until the next app switch.
  // Debounced so an approval burst refreshes once; the server RPC stays
  // the authoritative matcher.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshUnread = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(async () => {
      const unread = await loadUnreadReceivedCount();
      dispatch(setUnreadReceived(unread));
    }, 500);
  }, [dispatch]);
  useReceivedComplimentsRealtime(username, refreshUnread);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.navBg,
          borderTopColor: theme.colors.navBord,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 24,
          height: 82,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={<HomeIcon size={22} color={focused ? '#F5C842' : theme.colors.faint} />} label="Home" color={focused ? '#F5C842' : theme.colors.faint} />
          ),
        }}
      />
      <Tab.Screen
        name="RecapTab"
        component={RecapScreen}
        options={{
          // Empty-string badge + tight style renders a plain red dot (no
          // count) when there are unseen received compliments. Cleared by
          // RecapScreen on focus via markReceivedRead + setUnreadReceived(0).
          tabBarBadge: unreadReceived > 0 ? '' : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF5A5A',
            minWidth: 10,
            maxWidth: 10,
            height: 10,
            borderRadius: 5,
            lineHeight: 10,
            marginTop: 4,
          },
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={<RecapIcon size={22} color={focused ? '#FFB347' : theme.colors.faint} />} label="Recap" color={focused ? '#FFB347' : theme.colors.faint} />
          ),
        }}
      />
      <Tab.Screen
        name="GroupsTab"
        component={GroupsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={<GroupsIcon size={22} color={focused ? '#C3B1E1' : theme.colors.faint} />} label="Groups" color={focused ? '#C3B1E1' : theme.colors.faint} />
          ),
        }}
      />
      <Tab.Screen
        name="TeamsTab"
        component={TeamsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={<BuildingIcon size={22} color={focused ? '#FFB347' : theme.colors.faint} />} label="For Teams" color={focused ? '#FFB347' : theme.colors.faint} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={<SettingsIcon size={22} color={focused ? '#5C6BC0' : theme.colors.faint} />} label="Settings" color={focused ? '#5C6BC0' : theme.colors.faint} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const onboarded = useSelector((s: RootState) => s.app.onboarded);
  const { theme } = useStyles();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top']}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!onboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
        {/* Root-level so a tapped `/c/:id` universal link resolves even
            before onboarding — a brand-new install (or a reinstall that lost
            the onboarded flag) tapping a share link would otherwise dead-end,
            because the linking target lived only under Main. Standalone view,
            no tabs needed. See App.tsx linking config. */}
        <Stack.Screen name="Compliment" component={ComplimentViewScreen} />
      </Stack.Navigator>
    </SafeAreaView>
  );
}
