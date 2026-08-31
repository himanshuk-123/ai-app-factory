import type { ILLMProvider, LLMGenerateOptions } from './types.js';

export class MockLLMProvider implements ILLMProvider {
  name = 'MockLLMProvider';

  async generateText(options: LLMGenerateOptions): Promise<string> {
    return `[Mock Response] Analysis for prompt: ${options.userPrompt.slice(0, 50)}...`;
  }

  async generateStructured<T>(options: LLMGenerateOptions): Promise<T> {
    const prompt = (options.userPrompt + ' ' + (options.systemPrompt || '')).toLowerCase();

    // 1. Product Strategist Request
    if (prompt.includes('product-spec') || prompt.includes('product specification') || prompt.includes('mvp features')) {
      return {
        appName: 'PaceStudent',
        oneLineDescription: 'Smart campus budget and expense tracking app for students.',
        targetAudience: ['Undergraduate Students', 'Graduate Students', 'Campus Residents'],
        mvpFeatures: [
          { featureId: 'feat_1', featureName: 'Burn-Rate Dashboard', description: 'Real-time term spending budget tracking.', priority: 'HIGH' },
          { featureId: 'feat_2', featureName: 'Roommate Ledger', description: 'Split rent and utilities with campus flatmates.', priority: 'HIGH' },
          { featureId: 'feat_3', featureName: 'Receipt Camera & OCR', description: 'Quick scan receipts to log food & books.', priority: 'MEDIUM' },
          { featureId: 'feat_4', featureName: 'Campus Micro-Savings', description: 'Round up spare change on purchases.', priority: 'MEDIUM' },
          { featureId: 'feat_5', featureName: 'Term & Profile Settings', description: 'Manage student profile and monthly limits.', priority: 'LOW' }
        ],
        futureFeatures: ['Bank account integration', 'Financial aid planning', 'Group trip budgeting'],
        userPersonas: [
          { name: 'Alex Chen', role: 'Engineering Student', goals: ['Stay within monthly allowance', 'Split rent accurately'] }
        ],
        userJourneys: [
          { journeyName: 'Log Daily Expense', steps: ['Open Dashboard', 'Tap Add Expense', 'Save Transaction'] }
        ],
        completeScreenList: [
          { screenId: 'screen_dashboard', screenName: 'Burn-Rate Dashboard', purpose: 'Overview of budget and recent transactions', priorityOrder: 1 },
          { screenId: 'screen_roommates', screenName: 'Roommate Ledger', purpose: 'Split expenses with flatmates', priorityOrder: 2 },
          { screenId: 'screen_receipt_scan', screenName: 'Receipt Camera & OCR', purpose: 'Scan purchase receipts', priorityOrder: 3 },
          { screenId: 'screen_savings', screenName: 'Campus Micro-Savings', purpose: 'Track spare change savings goals', priorityOrder: 4 },
          { screenId: 'screen_settings', screenName: 'Term & Profile Settings', purpose: 'User settings and budget caps', priorityOrder: 5 }
        ],
        navigationStructure: { primaryType: 'BOTTOM_TABS', defaultScreen: 'screen_dashboard' },
        techStackRecommendation: { frontend: 'React + TypeScript', mobile: 'React Native + Expo', styling: 'CSS Modules' },
        monetizationModel: 'Freemium with premium budget analytics'
      } as unknown as T;
    }

    // 2. UX Architect Request
    if (prompt.includes('ux specification') || prompt.includes('ux-spec') || prompt.includes('ux architect')) {
      const defaultScreens = [
        {
          screenId: 'screen_dashboard',
          screenName: 'Burn-Rate Dashboard',
          purpose: 'Main spending overview',
          userGoal: 'Check remaining daily budget',
          entryPoints: ['App launch'],
          exitActions: ['Navigate to Roommates', 'Scan receipt'],
          layoutStructure: 'Header, progress bar, transaction list',
          uiComponents: ['BudgetCard', 'TransactionList', 'AddButton'],
          componentInteractions: ['Tap card to expand', 'Tap list item for details'],
          requiredData: ['monthlyLimit', 'spentSoFar', 'transactions'],
          loadingState: 'Skeleton loader',
          emptyState: 'No recent expenses recorded',
          errorState: 'Failed to load budget data',
          successState: 'Budget progress bar updated',
          responsiveConsiderations: 'Single column layout on mobile'
        },
        {
          screenId: 'screen_roommates',
          screenName: 'Roommate Ledger',
          purpose: 'Manage shared balances',
          userGoal: 'Settle up rent splits',
          entryPoints: ['Bottom nav tab'],
          exitActions: ['Return to Dashboard'],
          layoutStructure: 'Flatmate list with balances',
          uiComponents: ['RoommateCard', 'SettleButton'],
          componentInteractions: ['Tap Settle to mark paid'],
          requiredData: ['flatmates', 'balances'],
          loadingState: 'Spinner',
          emptyState: 'No flatmate splits pending',
          errorState: 'Failed to sync ledger',
          successState: 'Settlement confirmed',
          responsiveConsiderations: 'Cards stack vertically'
        },
        {
          screenId: 'screen_receipt_scan',
          screenName: 'Receipt Camera & OCR',
          purpose: 'Quick receipt scanning',
          userGoal: 'Scan food or textbook receipt',
          entryPoints: ['Dashboard action button'],
          exitActions: ['Return to Dashboard after save'],
          layoutStructure: 'Camera preview overlay',
          uiComponents: ['CameraFrame', 'CaptureButton'],
          componentInteractions: ['Tap capture to scan text'],
          requiredData: ['cameraPermission'],
          loadingState: 'Processing OCR...',
          emptyState: 'Align receipt within frame',
          errorState: 'Camera access denied',
          successState: 'Receipt scanned successfully',
          responsiveConsiderations: 'Full screen viewport'
        },
        {
          screenId: 'screen_savings',
          screenName: 'Campus Micro-Savings',
          purpose: 'Track micro-savings goals',
          userGoal: 'View round-up savings total',
          entryPoints: ['Bottom tab'],
          exitActions: ['Return to Dashboard'],
          layoutStructure: 'Savings goal cards',
          uiComponents: ['GoalCard', 'DepositButton'],
          componentInteractions: ['Tap Deposit to add funds'],
          requiredData: ['savingsTotal', 'goals'],
          loadingState: 'Skeleton cards',
          emptyState: 'No savings goals set',
          errorState: 'Error updating savings',
          successState: 'Goal progress increased',
          responsiveConsiderations: 'Grid or vertical list'
        },
        {
          screenId: 'screen_settings',
          screenName: 'Term & Profile Settings',
          purpose: 'Configure user options',
          userGoal: 'Update budget cap and profile',
          entryPoints: ['Bottom tab'],
          exitActions: ['Save settings'],
          layoutStructure: 'Form inputs list',
          uiComponents: ['InputField', 'SaveButton'],
          componentInteractions: ['Type limit and tap save'],
          requiredData: ['userProfile', 'budgetCap'],
          loadingState: 'Disabled inputs',
          emptyState: 'Settings loaded',
          errorState: 'Failed to save settings',
          successState: 'Settings updated',
          responsiveConsiderations: 'Centered form'
        }
      ];

      return {
        screens: defaultScreens,
        navigationFlows: [
          { flowId: 'flow_1', flowName: 'Log Expense', steps: ['screen_dashboard', 'screen_receipt_scan'] }
        ],
        globalUXRules: ['Consistent dark theme colors', 'Instant feedback on button click'],
        sharedComponents: ['Header', 'Button', 'Card', 'Badge'],
        designRequirementsForStitch: ['Use vibrant primary accent color #6366F1', 'Dark background #0F172A']
      } as unknown as T;
    }

    // 3. Build Debugger Repair Request
    if (prompt.includes('repair') || prompt.includes('build failure') || prompt.includes('root cause')) {
      return {
        canFix: false,
        confidenceScore: 0.0,
        rootCause: 'No repair needed',
        proposedFix: 'N/A',
        fileFixes: []
      } as unknown as T;
    }

    // 4. Default Idea Validation Evaluation
    const isExpenseApp = prompt.includes('expense') || prompt.includes('budget') || prompt.includes('money') || prompt.includes('student');

    return {
      problem: isExpenseApp
        ? 'Students struggle to track monthly budgets, shared rent/utilities, and daily micro-expenses effectively.'
        : 'Users require a streamlined digital workflow to solve repetitive daily tasks.',
      targetUsers: isExpenseApp
        ? ['College students', 'University undergraduates', 'Young adults managing personal budgets']
        : ['General consumers', 'Early adopters'],
      valueProposition: isExpenseApp
        ? 'Automated student budget categorization, receipt scanning, and peer split-expense tracking.'
        : 'Simplified digital solution tailored to specific user needs.',
      competitionAssessment: isExpenseApp
        ? 'High competition from general apps (Splitwise, Mint), but low specialization for student financial aid & campus lifestyles.'
        : 'Moderate market competition with room for niche differentiation.',
      differentiation: isExpenseApp
        ? 'Student-centric UI, campus meal plan integrations, and automated peer balance reminders.'
        : 'Focus on simplicity, speed, and targeted UX.',
      technicalFeasibility: 'High feasibility using modern web/mobile tech stack (React Native / Next.js + Node backend).',
      monetizationPotential: isExpenseApp
        ? 'Freemium tier, premium budget analytics, campus partner discounts.'
        : 'Freemium subscriptions and premium feature add-ons.',
      keyRisks: [
        'User retention and engagement after initial onboarding.',
        'Data privacy and security for financial information.',
        'Market saturation by established personal finance platforms.'
      ],
      score: isExpenseApp ? 8.5 : 7.0,
      recommendation: 'PROCEED'
    } as unknown as T;
  }
}
