# Animation Control & Auto-Client Selection Features

## Animation Control System

### Overview
The app now includes a global animation control system that allows developers to pause and resume all CSS animations and transitions throughout the application.

### Usage
- **Keyboard Shortcut**: `Ctrl+Shift+A` (Windows/Linux) or `Cmd+Shift+A` (macOS)
- **Programmatic Access**: Use the `useAnimations()` hook in any component

### How It Works
- Uses CSS custom properties to control animation durations globally
- When paused: All animation durations are set to `0s`
- When enabled: Normal animation durations are restored
- Affects all styled-components using the theme's transition values

### Developer Hook
```javascript
import { useAnimations } from '../context/AnimationContext';

function MyComponent() {
  const { animationsEnabled, pauseAnimations, resumeAnimations, toggleAnimations } = useAnimations();
  
  return (
    <div>
      <p>Animations are {animationsEnabled ? 'enabled' : 'paused'}</p>
      <button onClick={toggleAnimations}>Toggle Animations</button>
    </div>
  );
}
```

## Auto-Client Selection

### Overview
On the Invoices → Create Invoice page, when time entries are selected, the system automatically detects if all selected entries belong to the same client and auto-selects that client in the dropdown.

### Behavior
- **Trigger**: Selecting/deselecting time entries
- **Condition**: All selected entries must have the same client
- **Requirement**: Client dropdown must be empty (won't override existing selection)
- **Debouncing**: 300ms delay to prevent flicker during rapid selections
- **Silent Operation**: No visual feedback, completely transparent to user

### Technical Details
- Uses `useDebounce` hook to prevent excessive updates
- Resets project and task filters when auto-selecting client
- Only activates when `filters.clientId` is empty
- Console logs auto-selection events for debugging

### Code Location
- Implementation: `src/renderer/src/components/Invoice.CreateInvoice.js`
- Debounce hook: `src/renderer/src/hooks/useDebounce.js`
- Animation context: `src/renderer/src/context/AnimationContext.js`

## Testing

### Animation Control
1. Open the app
2. Press `Ctrl+Shift+A` (or `Cmd+Shift+A`)
3. Watch console for animation state messages
4. Verify all transitions stop/resume

### Auto-Client Selection
1. Navigate to Invoices → Create Invoice
2. Ensure client dropdown is empty
3. Select multiple time entries from the same client
4. Watch client dropdown auto-populate after 300ms
5. Check console for auto-selection logs
