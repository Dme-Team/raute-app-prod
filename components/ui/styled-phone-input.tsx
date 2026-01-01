'use client'

import React from 'react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string
}

// Custom input component to match shadcn/ui style
const CustomInput = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
    return (
        <input
            className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
CustomInput.displayName = "CustomInput"

interface PhoneInputProps {
    value?: string
    onChange: (value?: string) => void
    className?: string
    placeholder?: string
    name?: string
    required?: boolean
    defaultCountry?: any
}

export function StyledPhoneInput({ value, onChange, className, placeholder, name, required, defaultCountry = 'US' }: PhoneInputProps) {
    return (
        <div className={cn("phone-input-container", className)}>
            <PhoneInput
                international
                defaultCountry={defaultCountry}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                name={name}
                inputComponent={CustomInput}
                numberInputProps={{ required }} // Pass required to the actual input
                className="flex gap-2"
            />
            <style jsx global>{`
                .PhoneInputCountry {
                    margin-right: 8px;
                    display: flex;
                    align-items: center;
                }
                .PhoneInputCountrySelect {
                    background-color: transparent;
                    border: none;
                    cursor: pointer;
                    opacity: 0;
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    width: 100%;
                    z-index: 1;
                }
                .PhoneInputCountryIcon {
                    width: 24px;
                    height: 18px;
                    border-radius: 2px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                .PhoneInputCountryIconImg {
                    display: block;
                    width: 100%;
                    height: 100%;
                }
            `}</style>
        </div>
    )
}
