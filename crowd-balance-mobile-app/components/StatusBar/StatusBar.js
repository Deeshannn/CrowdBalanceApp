import { StatusBar as RNStatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AppStatusBar = ({ backgroundColor = "black", barStyle = "light-content" }) => {
  return (
    <>
      {/* Status bar configuration */}
      <RNStatusBar
        translucent={Platform.OS === 'android'}
        backgroundColor={backgroundColor}
        barStyle={barStyle}
      />
      
      {/* Safe area for status bar on iOS */}
      {Platform.OS === 'ios' && (
        <SafeAreaView 
          style={{ 
            backgroundColor,
            flex: 0  // Important: prevents taking full screen
          }} 
        />
      )}
    </>
  );
};

export default AppStatusBar;