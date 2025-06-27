interface StepIndicatorProps {
  currentStep: number
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { number: 1, title: "Color Scheme", description: "Choose your preferred style" },
    { number: 2, title: "Upgrade Options", description: "Select additional features" },
    { number: 3, title: "Floor Plan", description: "Mark upgrade locations" },
    { number: 4, title: "Review & Submit", description: "Confirm your selections" },
  ]

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step.number ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              {step.number}
            </div>
            <div className="mt-2 text-center">
              <p className={`text-sm font-medium ${currentStep >= step.number ? "text-blue-600" : "text-gray-500"}`}>
                {step.title}
              </p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-4 ${currentStep > step.number ? "bg-blue-600" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  )
}
